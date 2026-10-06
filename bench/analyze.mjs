// Aggregates <dir>/matrix.jsonl: median (and min–max) per scenario × widget, plus the
// pass/fail criteria agreed for the PoC. Writes <dir>/summary.json.
// Usage: node bench/analyze.mjs [dir]   (default bench/results/current)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = process.argv[2] ? pathToFileURL(resolve(process.argv[2]) + "/") : new URL("./results/current/", import.meta.url);
const rows = readFileSync(new URL("./matrix.jsonl", DIR), "utf8").trim().split("\n").map(JSON.parse);
// Mobile "open ticket" comes from a supplementary pass (mobile-ticket.jsonl) for BOTH widgets:
// in the 2026-10-06 run the first mobile pass could not find the MUI card button (selector bug).
const ticketFile = new URL("./mobile-ticket.jsonl", DIR);
const mobileTicket = existsSync(ticketFile) ? readFileSync(ticketFile, "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.ok) : [];
const runs = rows.filter((r) => !r.soak);
const soak = rows.filter((r) => r.soak && r.ok);

const median = (xs) => {
  const v = xs.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : +((v[m - 1] + v[m]) / 2).toFixed(2);
};
const range = (xs) => {
  const v = xs.filter((x) => typeof x === "number" && Number.isFinite(x));
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
};
const metric = (list, get) => ({ median: median(list.map(get)), range: range(list.map(get)) });
const inter = (r, label) => r.interactions?.find((i) => i.label === label && i.ok)?.maxEventMs;

const groups = new Map();
for (const r of runs) {
  const key = [r.device, r.size, r.tps, r.profile].join("|");
  if (!groups.has(key)) groups.set(key, { device: r.device, size: r.size, tps: r.tps, profile: r.profile, mui: [], ag: [], failed: { mui: 0, ag: 0 } });
  const g = groups.get(key);
  if (r.ok) g[r.widget].push(r);
  else g.failed[r.widget] += 1;
}

// Pass criteria (proposed to and accepted by the user).
const criteria = {
  ticksRatio: { label: "Ticks logrados ≥ 95 % de lo elegible", min: 0.95 },
  idleP95: { label: "Frame p95 con ticks ≤ 50 ms", max: 50 },
  scrollFps: { label: "Scroll ≥ 30 FPS", min: 30 },
  longTaskMax: { label: "Ningún long task > 200 ms", max: 200 },
};

const scenarios = [...groups.values()].map((g) => {
  const per = (list) => ({
    n: list.length,
    firstRowsMs: metric(list, (r) => r.load.firstRowsMs),
    // Transferred bytes are not comparable (MUI's chunks are cached from the login page, which
    // also uses MUI); the decoded size of all JS the page executed is.
    jsKB: metric(list, (r) => r.load.jsDecodedKB),
    jsTransferKB: metric(list, (r) => r.load.jsKB),
    fps: metric(list, (r) => r.idle.fps),
    p95: metric(list, (r) => r.idle.p95),
    p99: metric(list, (r) => r.idle.p99),
    longTasks: metric(list, (r) => r.idle.longTasks),
    longTaskMax: metric(list, (r) => Math.max(r.idle.longTaskMax, r.scroll?.longTaskMax ?? 0)),
    mainBusyPct: metric(list, (r) => r.idle.mainBusyPct),
    scriptMsPerSec: metric(list, (r) => r.idle.scriptMsPerSec),
    layoutStyleMsPerSec: metric(list, (r) => r.idle.layoutStyleMsPerSec),
    ticksPerSec: metric(list, (r) => r.idle.ticksPerSec),
    flashesPerSec: metric(list, (r) => r.idle.flashesPerSec),
    scrollFps: metric(list, (r) => r.scroll?.fps),
    scrollP95: metric(list, (r) => r.scroll?.p95),
    scrollBlank: metric(list, (r) => (r.scroll ? r.scroll.blankFrames / Math.max(1, r.scroll.samples) : null)),
    openTicketMs:
      list[0]?.device === "mobile"
        ? metric(
            mobileTicket.filter((t) => t.size === list[0].size && t.tps === list[0].tps && t.widget === list[0].widget),
            (r) => inter(r, "openTicket"),
          )
        : metric(list, (r) => inter(r, "openTicket")),
    sortMs: metric(list, (r) => inter(r, "sort")),
    filterMs: metric(list, (r) => inter(r, "filterTyping")),
    heapMB: metric(list, (r) => r.heapMB),
    domNodes: metric(list, (r) => r.domNodes),
    exceptions: list.reduce((a, r) => a + (r.exceptions?.length ?? 0), 0),
  });
  return { device: g.device, size: g.size, tps: g.tps, profile: g.profile, failed: g.failed, mui: per(g.mui), ag: per(g.ag) };
});

// "Elegible" ticks: both widgets get the same seeded stream, so the best observed rate across
// widgets in a scenario approximates the deliverable rate (closed/suspended/no-permission skipped).
for (const s of scenarios) {
  const eligible = Math.max(s.mui.ticksPerSec.median ?? 0, s.ag.ticksPerSec.median ?? 0, 0);
  for (const w of ["mui", "ag"]) {
    const m = s[w];
    m.ticksRatio = eligible ? +((m.ticksPerSec.median ?? 0) / eligible).toFixed(3) : null;
    m.pass = {
      ticksRatio: m.ticksRatio != null && m.ticksRatio >= criteria.ticksRatio.min,
      idleP95: (m.p95.median ?? Infinity) <= criteria.idleP95.max,
      scrollFps: (m.scrollFps.median ?? 0) >= criteria.scrollFps.min,
      longTaskMax: (m.longTaskMax.median ?? Infinity) <= criteria.longTaskMax.max,
    };
  }
}

const soakSummary = soak.map((r) => {
  const first = r.samples[0];
  const last = r.samples.at(-1);
  return {
    widget: r.widget,
    minutes: +(last.t / 60).toFixed(1),
    heapStartMB: first.heapMB,
    heapEndMB: last.heapMB,
    heapGrowthPct: +(((last.heapMB - first.heapMB) / first.heapMB) * 100).toFixed(1),
    nodesStart: first.nodes,
    nodesEnd: last.nodes,
    nodesGrowthPct: +(((last.nodes - first.nodes) / first.nodes) * 100).toFixed(1),
    samples: r.samples,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  totals: {
    runs: runs.length,
    ok: runs.filter((r) => r.ok).length,
    failed: runs.filter((r) => !r.ok).length,
    mobileTicket: mobileTicket.length,
    soak: soak.length,
    firstRunAt: runs.map((r) => r.at).filter(Boolean).sort()[0] ?? null,
  },
  errors: runs.filter((r) => !r.ok).map((r) => ({ key: [r.device, r.size, r.tps, r.profile, r.widget, r.rep].join("|"), error: r.error })),
  criteria,
  scenarios: scenarios.sort((a, b) => a.device.localeCompare(b.device) || a.size - b.size || a.tps - b.tps || a.profile.localeCompare(b.profile)),
  soak: soakSummary,
};
writeFileSync(new URL("./summary.json", DIR), JSON.stringify(summary, null, 2));

// Console table for a quick read.
const fmt = (m) => (m?.median == null ? "—" : String(m.median));
console.log(`runs ok ${summary.totals.ok}/${summary.totals.runs}`);
console.log("device  size tps prof | fps mui/ag | p95 mui/ag | busy% mui/ag | script mui/ag | scrollFps mui/ag | ticket mui/ag | sort mui/ag | filter mui/ag");
for (const s of summary.scenarios) {
  console.log(`${s.device.padEnd(7)} ${String(s.size).padStart(4)} ${String(s.tps).padStart(3)} ${s.profile.padEnd(4)} | ${fmt(s.mui.fps)}/${fmt(s.ag.fps)} | ${fmt(s.mui.p95)}/${fmt(s.ag.p95)} | ${fmt(s.mui.mainBusyPct)}/${fmt(s.ag.mainBusyPct)} | ${fmt(s.mui.scriptMsPerSec)}/${fmt(s.ag.scriptMsPerSec)} | ${fmt(s.mui.scrollFps)}/${fmt(s.ag.scrollFps)} | ${fmt(s.mui.openTicketMs)}/${fmt(s.ag.openTicketMs)} | ${fmt(s.mui.sortMs)}/${fmt(s.ag.sortMs)} | ${fmt(s.mui.filterMs)}/${fmt(s.ag.filterMs)}`);
}
for (const s of soakSummary) console.log(`soak ${s.widget}: heap ${s.heapStartMB}→${s.heapEndMB} MB (${s.heapGrowthPct}%), nodes ${s.nodesStart}→${s.nodesEnd} (${s.nodesGrowthPct}%)`);
if (summary.errors.length) console.log("errores:", summary.errors.slice(0, 10));
