#!/usr/bin/env python3
"""
Automated .gov.in Notice Ingestion Watcher (Crawl4AI) for CS Odisha.
Crawls official Odisha recruitment portals (OPSC, OSSC, OSSSC), filters strictly
to .gov.in / .nic.in domains, deduplicates against seen_urls.json, and writes
normalized drafts-queue.json for Admin Studio import.
"""

import argparse
import asyncio
import json
import os
import re
import urllib.error
import urllib.request
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


def load_sync_token(explicit_token: str | None) -> str:
    if explicit_token:
        return explicit_token.strip()
    env_tok = os.environ.get("CSO_CRAWL_SYNC_TOKEN", "").strip()
    if env_tok:
        return env_tok
    env_file = Path.home() / ".config" / "csodisha" / "crawl-sync.env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == "CSO_CRAWL_SYNC_TOKEN":
                return v.strip().strip('"').strip("'")
    return ""


def sync_drafts_to_api(drafts: list[dict], api_url: str, token: str) -> None:
    if not token:
        print("Sync skipped: CSO_CRAWL_SYNC_TOKEN not set (pass --token or set ~/.config/csodisha/crawl-sync.env).")
        return
    payload = json.dumps({"drafts": drafts}).encode("utf-8")
    req = urllib.request.Request(
        api_url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "X-Crawl-Sync-Token": token,
            "User-Agent": "CSOdisha-Crawl4AI-Watcher/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8") or "{}")
            print(
                f"Remote D1 sync complete: inserted={body.get('inserted', 0)}, "
                f"updated={body.get('updated', 0)}, total_pending={body.get('total_pending', 0)}"
            )
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:200]
        print(f"Remote D1 sync failed (HTTP {exc.code}): {detail}")
    except Exception as exc:
        print(f"Remote D1 sync error: {exc}")


async def run_watcher(sync: bool = False, api_url: str = "https://csodisha.com/api/admin/crawl-drafts", token: str | None = None) -> None:
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

    if sync:
        sync_drafts_to_api(combined, api_url, load_sync_token(token))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CS Odisha Crawl4AI .gov.in Notice Watcher")
    parser.add_argument("--sync", action="store_true", help="Sync drafts-queue.json to D1 admin endpoint")
    parser.add_argument("--api-url", default="https://csodisha.com/api/admin/crawl-drafts", help="Target /api/admin/crawl-drafts URL")
    parser.add_argument("--token", default=None, help="Sync bearer token (defaults to CSO_CRAWL_SYNC_TOKEN)")
    args = parser.parse_args()
    asyncio.run(run_watcher(sync=args.sync, api_url=args.api_url, token=args.token))
