# AV Safety Tracker

A live dashboard of **NHTSA Standing General Order (SGO 2021-01) ADS crash reports** — every crash that companies running automated driving systems are federally required to report. Shows incidents over time, by company, by injury severity, and by state. Loads instantly, never sleeps, costs $0, and refreshes itself.

**Why this one matters for your job search:** this is the exact public dataset that safety, policy, and product teams at Waymo, Aurora, Zoox, Nuro, and Kodiak live in. A clean tracker over it is a credible "I think about AV deployment and safety the way you do" artifact for a hiring manager — and the source of strong LinkedIn material.

## Architecture (same $0 stack as Auto Reg Advisor)
- `public/index.html` — static dashboard (Chart.js from CDN). Reads `public/data/av_safety.json`.
- `scripts/build-data.mjs` — downloads the NHTSA SGO ADS CSV, parses it, aggregates to compact JSON.
- `.github/workflows/refresh.yml` — weekly GitHub Action runs the script and commits fresh data. No involvement from you.

## Deploy (same as App A)
1. Push this folder to a GitHub repo.
2. Import to **Vercel** → framework **Other** → Deploy. (No env vars or API keys needed — it's pure static + a data file.)
3. **Actions tab → enable workflows.** Then run "Refresh AV safety data" once manually (**Run workflow**) to populate the dashboard the first time.

## Data sources
- **Primary (automated):** NHTSA SGO ADS incident reports — `https://static.nhtsa.gov/odi/ffdd/sgo-2021-01/SGO-2021-01_Incident_Reports_ADS.csv`. Direct, static, refreshed by NHTSA ~monthly. Field definitions: SGO-2021-01 Data Element Definitions (PDF on the NHTSA SGO page).
- **Secondary (manual, optional):** California DMV autonomous-vehicle disengagement & mileage reports (annual CSVs, gated behind the DMV portal). Can be added as a second dataset later if you want disengagement-rate views.

> First-run note: I built the CSV parser to find columns by header name (resilient to NHTSA reordering them), but I couldn't execute it here. On the first Action run, check the dashboard; if any panel looks off, send me the CSV header row and I'll tune the column matches in `build-data.mjs`.

## Add the Level-2 ADAS dataset (optional)
NHTSA also publishes an ADAS (Level 2) CSV. To track it too, copy `build-data.mjs`, point `SGO_CSV_URL` at the ADAS file, write to `av_adas.json`, and add a tab to the dashboard.

## Disclaimer
Reporting practices differ by company, so raw incident counts are **not** a direct ranking of safety. Reference only.
