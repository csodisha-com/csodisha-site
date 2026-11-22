#!/usr/bin/env python3
"""
Automated .gov.in Notice Ingestion Watcher (Crawl4AI) for CS Odisha.
Crawls official Odisha recruitment portals (OPSC, OSSC, OSSSC), filters strictly
to .gov.in / .nic.in domains, deduplicates against seen_urls.json, and writes
normalized drafts-queue.json for Admin Studio import.
"""

import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

from crawl4ai import AsyncWebCrawler

BASE_DIR = Path(__file__).resolve().parent
SOURCES_FILE = BASE_DIR / "sources.json"
SEEN_FILE = BASE_DIR / "seen_urls.json"
DRAFTS_FILE = BASE_DIR / "drafts-queue.json"

ALLOWED_SUFFIXES = (".gov.in", ".nic.in", ".odisha.gov.in")
NOTICE_KEYWORDS = re.compile(
    r"(advertisement|advt|recruitment|notification|notice|corrigendum|syllabus|exam|result|admit|apply|online)",
    re.IGNORECASE,
)
DATE_DMY_RE = re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b")
DATE_YMD_RE = re.compile(r"\b(20\d{2})-(\d{2})-(\d{2})\b")
LINK_MD_RE = re.compile(r"\[([^\]]{6,200})\]\(([^)\s]+)\)")


def is_verified_gov_url(url: str) -> bool:
    """Strictly allow only HTTPS URLs hosted on .gov.in or .nic.in domains."""
    try:
        parsed = urlparse(str(url or "").strip())
    except Exception:
        return False
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower().rstrip(".")
    return any(host == s.lstrip(".") or host.endswith(s) for s in ALLOWED_SUFFIXES)


def extract_deadline(text: str) -> str:
    """Extract ISO YYYY-MM-DD deadline date if present in notice text."""
    ymd = DATE_YMD_RE.search(text)
    if ymd:
        return f"{ymd.group(1)}-{ymd.group(2)}-{ymd.group(3)}"
    dmy = DATE_DMY_RE.search(text)
    if dmy:
        day = dmy.group(1).zfill(2)
        month = dmy.group(2).zfill(2)
        year = dmy.group(3)
        if 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
            return f"{year}-{month}-{day}"
    return ""


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def extract_notices_from_markdown(markdown: str, source: dict, fetched_at: str) -> list[dict]:
    notices = []
    base_url = source["url"]
    agency = source["agency"]

    for match in LINK_MD_RE.finditer(markdown or ""):
        raw_title = " ".join(match.group(1).split()).strip()
        raw_href = match.group(2).strip()
        if not NOTICE_KEYWORDS.search(raw_title) and not raw_href.lower().endswith(".pdf"):
            continue

        resolved = urljoin(base_url, raw_href)
        if not is_verified_gov_url(resolved):
            continue
        if re.search(r"\.(?:jpe?g|png|gif|svg|webp)(?:[?#]|$)", resolved, re.I):
            continue

        domain = urlparse(resolved).hostname.lower()
        last_date = extract_deadline(raw_title)
        important_dates = (
            [{"label": "Last Date to Apply", "date": last_date}] if last_date else []
        )

        notices.append(
            {
                "title": raw_title[:150],
                "agency": agency,
                "official_url": resolved,
                "last_date": last_date,
                "important_dates": important_dates,
                "summary": f"Official {agency} notice ingested from {domain}: {raw_title[:240]}",
                "source_domain": domain,
                "fetched_at": fetched_at,
            }
        )
    return notices


async def crawl_with_retry(crawler: AsyncWebCrawler, url: str):
    """Crawl a URL with 1 retry after 2s on transient network errors."""
    transient_re = re.compile(r"ERR_NETWORK_CHANGED|ERR_CONNECTION_RESET", re.IGNORECASE)
    for attempt in range(2):
        try:
            result = await crawler.arun(url=url)
            err_msg = str(getattr(result, "error_message", "") or "")
            if result and getattr(result, "success", False):
                return result
            if attempt == 0 and transient_re.search(err_msg):
                await asyncio.sleep(2)
                continue
            return result
        except Exception as exc:
            if attempt == 0 and transient_re.search(str(exc)):
                await asyncio.sleep(2)
                continue
            return None
    return None


async def run_watcher() -> None:
    sources = load_json(SOURCES_FILE, [])
    valid_sources = [s for s in sources if is_verified_gov_url(s.get("url", ""))]
    seen_list = load_json(SEEN_FILE, [])
    seen_set = set(seen_list) if isinstance(seen_list, list) else set()
    existing_drafts = load_json(DRAFTS_FILE, [])
    if not isinstance(existing_drafts, list):
        existing_drafts = []

    fetched_at = datetime.now(timezone.utc).isoformat()
    new_drafts = []

    async with AsyncWebCrawler() as crawler:
        for src in valid_sources:
            result = await crawl_with_retry(crawler, src["url"])
            if not result or not getattr(result, "success", False):
                continue
            md = getattr(result, "markdown", "") or ""
            for item in extract_notices_from_markdown(md, src, fetched_at):
                if item["official_url"] in seen_set:
                    continue
                seen_set.add(item["official_url"])
                new_drafts.append(item)

    combined = new_drafts + existing_drafts
    DRAFTS_FILE.write_text(json.dumps(combined, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    SEEN_FILE.write_text(json.dumps(sorted(seen_set), indent=2) + "\n", encoding="utf-8")
    print(f"Crawl4AI watcher complete: {len(new_drafts)} new .gov.in drafts added ({len(combined)} total in queue).")


if __name__ == "__main__":
    asyncio.run(run_watcher())
