# California DMV disengagement data — drop files here

The DMV releases this data as an **annual WeTransfer ZIP** (the download link on their site is tokenized and expires), so it can't be auto-fetched. The data is annual anyway, so this is a once-a-year, 2-minute task.

## How to add / update (once a year)
1. Go to the [DMV Disengagement Reports page](https://www.dmv.ca.gov/portal/vehicle-industry-services/autonomous-vehicles/disengagement-reports/) and download the current ZIP.
2. From it, copy into this folder:
   - the **disengagement** report CSV  → rename to `disengagement_latest.csv`
   - the **mileage** report CSV (if separate) → rename to `mileage_latest.csv`
3. Commit. Tell Claude "Cal DMV files are in" — the parser + a "disengagements per 1,000 autonomous miles by company" dashboard tab will be wired up.

Until files are present, the tracker runs on NHTSA data only.
