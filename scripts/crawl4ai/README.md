# CSOdisha Automated `.gov.in` Notice Ingestion (Crawl4AI)

Local Python watcher that monitors official Odisha recruitment portals (`OPSC`, `OSSC`, `OSSSC`) defined in `sources.json`, enforces strict `.gov.in` / `.nic.in` domain validation, deduplicates against `seen_urls.json`, and writes normalized notices to `drafts-queue.json` for one-click import into Admin Studio.

## Setup (Local Python Environment)

```bash
pip install crawl4ai
crawl4ai-setup
```

## Run the Watcher

```bash
python3 scripts/crawl4ai/watch_gov_notices.py
```

This generates/updates `scripts/crawl4ai/drafts-queue.json` and `scripts/crawl4ai/seen_urls.json`.

## Import into Admin Studio

1. Open `/admin/` and navigate to **Jobs & Careers → Create New Job Alert**.
2. In the **📥 Incoming `.gov.in` Draft Queue** panel, click **Load drafts-queue.json** and select `scripts/crawl4ai/drafts-queue.json` (or `scripts/crawl4ai/sample-drafts-queue.json` for offline testing).
3. Review the verified `.gov.in` badge, click **Load into Editor** to populate all form fields and Important Dates, verify, and publish.
