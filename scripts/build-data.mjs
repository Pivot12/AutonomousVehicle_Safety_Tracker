// Ingest NHTSA Standing General Order (SGO) ADS crash data -> compact JSON for the dashboard.
// Run by GitHub Actions (free, monthly). No human involvement. No paid services.
// Source CSV (direct, static, refreshed by NHTSA): SGO-2021-01_Incident_Reports_ADS.csv

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data"); // served as a static asset by Vercel
mkdirSync(OUT, { recursive: true });

const SOURCE_URL =
  process.env.SGO_CSV_URL ||
  "https://static.nhtsa.gov/odi/ffdd/sgo-2021-01/SGO-2021-01_Incident_Reports_ADS.csv";

// --- RFC-4180-ish CSV parser (handles quoted fields, embedded commas/newlines) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", i = 0, inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// find a column index by trying candidate header substrings (case-insensitive)
function findCol(headers, candidates) {
  const h = headers.map((x) => (x || "").trim().toLowerCase());
  // exact match FIRST — prevents "State" matching "Source - State or Other Agency"
  for (const cand of candidates) {
    const idx = h.findIndex((x) => x === cand.toLowerCase());
    if (idx !== -1) return idx;
  }
  // then fall back to substring match
  for (const cand of candidates) {
    const idx = h.findIndex((x) => x.includes(cand.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function toYearMonth(s) {
  if (!s) return null;
  let m = s.match(/(\d{4})[-/](\d{1,2})/);            // 2026-03 or 2026/3
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}`;
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  m = s.toLowerCase().match(/([a-z]{3})[a-z]*[-\s/]?(\d{4})/);   // MAR-2026 / March 2026
  if (m && months[m[1]]) return `${m[2]}-${months[m[1]]}`;
  return null;
}

function inc(map, key) { if (!key) return; map[key] = (map[key] || 0) + 1; }
function topN(map, n) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ name: k, count: v }));
}

console.log("Downloading SGO ADS CSV …");
const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "av-safety-tracker" } });
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const text = await res.text();
const rows = parseCSV(text);
if (rows.length < 2) throw new Error("Empty/unparseable CSV");

const headers = rows[0];
const col = {
  entity: findCol(headers, ["Reporting Entity"]),
  date: findCol(headers, ["Incident Date"]),
  state: findCol(headers, ["State"]),
  city: findCol(headers, ["City"]),
  severity: findCol(headers, ["Highest Injury Severity", "Injury Severity"]),
  make: findCol(headers, ["SV Make", "Make"]),
  model: findCol(headers, ["SV Model", "Model"]),
  crashWith: findCol(headers, ["Crash With"]),
  version: findCol(headers, ["Report Version"]),
};

const byMonth = {}, byEntity = {}, bySeverity = {}, byState = {};
const recent = [];
let total = 0;
const get = (r, idx) => (idx >= 0 && idx < r.length ? (r[idx] || "").trim() : "");

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length < 2) continue;
  total++;
  const ym = toYearMonth(get(row, col.date));
  inc(byMonth, ym);
  inc(byEntity, get(row, col.entity) || "Unknown");
  inc(bySeverity, get(row, col.severity) || "Unreported");
  inc(byState, get(row, col.state) || "Unknown");
  recent.push({
    date: get(row, col.date),
    ym,
    entity: get(row, col.entity),
    make: get(row, col.make),
    model: get(row, col.model),
    state: get(row, col.state),
    severity: get(row, col.severity),
    crashWith: get(row, col.crashWith),
  });
}

const months = Object.keys(byMonth).filter(Boolean).sort();
recent.sort((a, b) => (b.ym || "").localeCompare(a.ym || ""));

const out = {
  meta: {
    source: "NHTSA Standing General Order 2021-01 (ADS crash reports)",
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    totalIncidents: total,
    dateRange: months.length ? `${months[0]} to ${months[months.length - 1]}` : "n/a",
  },
  byMonth: months.map((m) => ({ month: m, count: byMonth[m] })),
  byEntity: topN(byEntity, 15),
  bySeverity: topN(bySeverity, 10),
  byState: topN(byState, 15),
  recent: recent.slice(0, 200),
};

writeFileSync(join(OUT, "av_safety.json"), JSON.stringify(out, null, 2));
console.log(`Done. ${total} incidents, ${months.length} months. Wrote data/av_safety.json`);
