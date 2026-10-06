// MUI X vs AG Grid watchlist benchmark matrix, against the production build on Vercel.
// Drives the locally installed Chrome (headless) over CDP; no dependencies.
//
// Usage: node bench/matrix.mjs <chunk> [reps]
//   chunk: desktop-500 | desktop-1000 | mobile | mobile-ticket | soak | smoke
// Results are appended to $BENCH_RESULTS (default bench/results/current/) as matrix.jsonl
// (resumable: finished runs are skipped). See bench/README.md.
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.env.BENCH_BASE_URL ?? "https://demo-widgets-xmxp-green.vercel.app";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9336;
const SEED = 7;
const chunk = process.argv[2] ?? "smoke";
const REPS = Number(process.argv[3] ?? 5);
const OUT_DIR = process.env.BENCH_RESULTS
  ? pathToFileURL(resolve(process.env.BENCH_RESULTS) + "/")
  : new URL("./results/current/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });
// mobile-ticket: supplementary run of the "open ticket" interaction on mobile for both widgets
// (the first mobile pass used a card selector that did not match MUI X 9's list view DOM).
const INTERACTIONS_ONLY = chunk === "mobile-ticket";
const OUT = new URL(chunk === "smoke" ? "./smoke.jsonl" : INTERACTIONS_ONLY ? "./mobile-ticket.jsonl" : "./matrix.jsonl", OUT_DIR);

const PHASE = { warmup: 5000, idle: 20000, scroll: 10000 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------------------------------------------------------------- scenarios
function scenarios() {
  const list = [];
  const add = (device, size, tps, profile) => {
    for (let rep = 0; rep < REPS; rep += 1) {
      // Alternate the order so neither widget always runs on a "warmer" machine.
      const order = rep % 2 === 0 ? ["mui", "ag"] : ["ag", "mui"];
      for (const widget of order) list.push({ device, size, tps, profile, widget, rep });
    }
  };
  if (chunk === "smoke") {
    add("desktop", 500, 100, "full");
  } else if (chunk.startsWith("desktop-")) {
    const size = Number(chunk.split("-")[1]);
    for (const tps of [25, 100, 400]) for (const profile of ["full", "core"]) add("desktop", size, tps, profile);
  } else if (chunk === "mobile" || chunk === "mobile-ticket") {
    // Cards are the same shared component in both widgets, so only the full profile applies.
    for (const size of [500, 1000]) for (const tps of [25, 100, 400]) add("mobile", size, tps, "full");
  }
  return list;
}
const keyOf = (s) => [s.device, s.size, s.tps, s.profile, s.widget, s.rep].join("|");

// ---------------------------------------------------------------- CDP plumbing
const profileDir = mkdtempSync(join(tmpdir(), "wl-matrix-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
  "about:blank",
], { stdio: "ignore" });

async function browserWs() {
  for (let i = 0; i < 100; i += 1) {
    try { return (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); }
  }
  throw new Error("Chrome did not start");
}

function connect(url) {
  const ws = new WebSocket(url);
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(`${p.method}: ${m.error.message}`));
      else p.resolve(m.result);
    } else for (const l of listeners) l(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    seq += 1; pending.set(seq, { resolve, reject, method });
    ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  return new Promise((r) => { ws.onopen = () => r({ send, on: (l) => listeners.add(l), off: (l) => listeners.delete(l), close: () => ws.close() }); });
}

// ---------------------------------------------------------------- in-page probes
const PROBE = `
window.__probe = (() => {
  const frames = []; const longTasks = []; let flashes = 0; let last = performance.now(); let running = true;
  const loop = (t) => { frames.push(t - last); last = t; if (running) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration)));
  po.observe({ type: "longtask", buffered: false });
  // Flash starts: MUI toggles wl-flash-up/down, AG toggles ag-cell-data-changed.
  const mo = new MutationObserver((ms) => { for (const m of ms) { const c = m.target.className; const o = m.oldValue || "";
    if (typeof c === "string" && ((c.includes("wl-flash-up") && !o.includes("wl-flash-up")) || (c.includes("wl-flash-down") && !o.includes("wl-flash-down")) || (c.includes("ag-cell-data-changed") && !o.includes("ag-cell-data-changed")))) flashes++; } });
  mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["class"], attributeOldValue: true });
  return { stop() { running = false; po.disconnect(); mo.disconnect(); return { frames, longTasks, flashes }; } };
})(); true`;

const READY = `(() => !!document.querySelector('.MuiDataGrid-row[data-id], .ag-row[row-id], .ag-full-width-row'))()`;
// The vertical scroller of either grid: largest scrollable descendant of the panel.
const FIND_SCROLLER = `(() => {
  const root = document.querySelector('.MuiDataGrid-root, .ag-root-wrapper');
  let best = null;
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 100) {
      if (!best || el.clientHeight > best.clientHeight) best = el;
    }
  }
  window.__scroller = best; return !!best;
})()`;

function summarize(raw, ms) {
  const f = raw.frames.slice(1).sort((a, b) => a - b);
  const pct = (p) => (f.length ? f[Math.min(f.length - 1, Math.floor(f.length * p))] : 0);
  return {
    fps: +(raw.frames.length / (ms / 1000)).toFixed(1),
    p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), p99: +pct(0.99).toFixed(1),
    over50: f.filter((x) => x > 50).length,
    longTasks: raw.longTasks.length,
    longTaskMax: Math.round(Math.max(0, ...raw.longTasks)),
    longTaskTotal: Math.round(raw.longTasks.reduce((a, b) => a + b, 0)),
    flashesPerSec: +(raw.flashes / (ms / 1000)).toFixed(1),
  };
}

// ---------------------------------------------------------------- one run
async function run(cdp, s) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", ...(await newContext(cdp)) });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const S = (method, params) => cdp.send(method, params, sessionId);
  const ev = async (expression) => {
    const r = await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split("\n")[0] ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const exceptions = [];
  const onEvent = (m) => { if (m.sessionId === sessionId && m.method === "Runtime.exceptionThrown") exceptions.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split("\n")[0]); };
  cdp.on(onEvent);
  try {
    await S("Page.enable"); await S("Runtime.enable"); await S("Performance.enable", { timeDomain: "threadTicks" });
    const mobile = s.device === "mobile";
    await S("Emulation.setDeviceMetricsOverride", mobile ? { width: 390, height: 844, deviceScaleFactor: 3, mobile: true } : { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await S("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });

    // Mock login flag (no credentials involved), then the isolated bench page.
    await S("Page.navigate", { url: `${BASE}/login` });
    for (let i = 0; i < 60 && !(await ev("document.readyState === 'complete'").catch(() => false)); i++) await sleep(250);
    await ev(`localStorage.setItem("demo-tws-authenticated", "true"); true`);
    await S("Emulation.setCPUThrottlingRate", { rate: mobile ? 4 : 1 });

    const url = `${BASE}/workstation?bench=${s.size}&tps=${s.tps}&widget=${s.widget}&profile=${s.profile}&seed=${SEED}`;
    const t0 = Date.now();
    await S("Page.navigate", { url });
    let ready = false;
    for (let i = 0; i < 240 && !(ready = await ev(READY).catch(() => false)); i++) await sleep(250);
    if (!ready) throw new Error("grid did not render");
    // Guard: an old deployment ignores ?widget= and renders the whole workspace.
    const isolation = await ev(`({ workspace: !!document.querySelector('.react-grid-item'), counters: Object.keys(window.__wlBench ?? {}) })`);
    if (isolation.workspace || isolation.counters.join() !== s.widget) throw new Error(`benchmark not isolated: ${JSON.stringify(isolation)}`);
    const load = {
      firstRowsMs: Date.now() - t0,
      ...(await ev(`(() => { const r = performance.getEntriesByType('resource'); const js = r.filter(e => e.initiatorType === 'script' || e.name.endsWith('.js'));
        return { jsKB: Math.round(js.reduce((a, e) => a + (e.transferSize || 0), 0) / 1024), jsDecodedKB: Math.round(js.reduce((a, e) => a + (e.decodedBodySize || 0), 0) / 1024), jsFiles: js.length }; })()`)),
    };

    await sleep(PHASE.warmup);
    if (INTERACTIONS_ONLY) {
      return { ...s, ok: true, url, load, interactions: await interact(S, ev, mobile), exceptions: exceptions.slice(0, 3) };
    }
    const view = await ev(`(() => ({ cards: !!document.querySelector('.MuiDataGrid-listViewCell, .ag-full-width-row'), rows: document.querySelectorAll('.MuiDataGrid-row[data-id], .ag-row[row-id], .ag-full-width-row').length }))()`);

    // ---- Phase: ticking, no interaction.
    await ev(`(() => { const c = window.__wlBench?.["${s.widget}"]; if (c) Object.assign(c, { batches: 0, ticks: 0, rowsPushed: 0, updateRowsMs: 0, maxUpdateRowsMs: 0 }); return true; })()`);
    const m0 = Object.fromEntries((await S("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    await ev(PROBE);
    const ti = Date.now(); await sleep(PHASE.idle);
    const rawIdle = await ev("window.__probe.stop()");
    const idleMs = Date.now() - ti;
    const m1 = Object.fromEntries((await S("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const counters = await ev(`window.__wlBench?.["${s.widget}"] ?? null`);

    // ---- Phase: continuous scroll while ticking.
    const hasScroller = await ev(FIND_SCROLLER);
    let scroll = null;
    if (hasScroller) {
      await ev(PROBE);
      await ev(`(() => { const s = window.__scroller; window.__blank = 0; window.__samples = 0; let dir = 1; window.__scrolling = true;
        const step = () => { if (!window.__scrolling) return; s.scrollTop += dir * 45; if (s.scrollTop + s.clientHeight >= s.scrollHeight - 2) dir = -1; if (s.scrollTop <= 0) dir = 1;
          window.__samples++; const r = s.getBoundingClientRect(); const probe = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!probe || !probe.closest('.MuiDataGrid-row, .ag-row, .ag-full-width-row')) window.__blank++; requestAnimationFrame(step); };
        requestAnimationFrame(step); return true; })()`);
      const ts = Date.now(); await sleep(PHASE.scroll);
      await ev("window.__scrolling = false; true");
      const rawScroll = await ev("window.__probe.stop()");
      scroll = { ...summarize(rawScroll, Date.now() - ts), blankFrames: await ev("window.__blank"), samples: await ev("window.__samples") };
      await ev("window.__scroller.scrollTop = 0; true");
      await sleep(500);
    }

    // ---- Phase: interaction latency while ticking (Event Timing API, the basis of INP).
    const interactions = await interact(S, ev, mobile);

    const m2 = Object.fromEntries((await S("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const busy = (a, b, ms) => +((((b.TaskDuration - a.TaskDuration) * 1000) / ms) * 100).toFixed(1);
    return {
      ...s, ok: true, url, load, view,
      idle: {
        ...summarize(rawIdle, idleMs),
        mainBusyPct: busy(m0, m1, idleMs),
        scriptMsPerSec: +((((m1.ScriptDuration - m0.ScriptDuration) * 1000) / idleMs) * 1000).toFixed(1),
        layoutStyleMsPerSec: +(((((m1.LayoutDuration - m0.LayoutDuration) + (m1.RecalcStyleDuration - m0.RecalcStyleDuration)) * 1000) / idleMs) * 1000).toFixed(1),
        ticksPerSec: counters ? +(counters.ticks / (idleMs / 1000)).toFixed(1) : null,
        pushAvgMs: counters?.batches ? +(counters.updateRowsMs / counters.batches).toFixed(2) : null,
        pushMaxMs: counters ? +counters.maxUpdateRowsMs.toFixed(1) : null,
      },
      scroll,
      interactions,
      heapMB: +(m2.JSHeapUsedSize / 1048576).toFixed(1),
      domNodes: m2.Nodes,
      exceptions: exceptions.slice(0, 3),
    };
  } finally {
    cdp.off(onEvent);
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

let contextId = null;
async function newContext(cdp) {
  if (contextId) await cdp.send("Target.disposeBrowserContext", { browserContextId: contextId }).catch(() => {});
  ({ browserContextId: contextId } = await cdp.send("Target.createBrowserContext", { disposeOnDetach: false }));
  return { browserContextId: contextId };
}

async function interact(S, ev, mobile) {
  await ev(`(() => { window.__events = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__events.push({ name: e.name, d: e.duration, id: e.interactionId, t: e.startTime, target: e.target?.className?.toString?.().slice(0, 40) }))).observe({ type: "event", durationThreshold: 16, buffered: false }); return true; })()`);
  const mouse = async (x, y) => {
    await S("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await S("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    await S("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  };
  const tap = async (x, y) => {
    await S("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await S("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const press = (x, y) => (mobile ? tap(x, y) : mouse(x, y));
  const measure = async (label, action) => {
    const before = await ev("window.__events.length");
    const tStart = Date.now();
    const done = await action();
    await sleep(700);
    // Only entries with an interactionId (pointerdown/up, click, keydown/up) count, as in INP.
    const evs = (await ev(`window.__events.slice(${before})`)).filter((e) => e.id > 0);
    const max = evs.reduce((a, e) => Math.max(a, e.d), 0);
    return { label, ok: done !== false, maxEventMs: Math.round(max), events: evs.length, wallMs: Date.now() - tStart };
  };
  const out = [];

  // 1. Open the order ticket from a quote (table: Ask cell; cards: "Venta" quote button).
  // First quote that is on screen and has a price (some instruments have no Ask, e.g. "—").
  // If the Ask column is scrolled out horizontally, bring it into view and look again.
  const findAsk = (allowScroll) => ev(`(() => {
    const vh = innerHeight, vw = innerWidth;
    // Table: the Ask cell. Cards (mobile): the card's buy quote; MUI X 9 list view renders cards
    // inside plain .MuiDataGrid-row/.MuiDataGrid-cell, AG Grid inside .ag-full-width-row.
    const sel = ${mobile}
      ? '.MuiDataGrid-row button[aria-label^="Comprar"]:not([disabled]), .ag-full-width-row button[aria-label^="Comprar"]:not([disabled])'
      : '.MuiDataGrid-row[data-id] [data-field="askPrice"] button:not([disabled]), .ag-row[row-id] .ag-cell[col-id="askPrice"]';
    const cands = [...document.querySelectorAll(sel)]
      .filter((el) => /\\d/.test(el.innerText));
    for (const el of cands) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.top > 120 && r.bottom < vh - 20 && r.left >= 0 && r.right <= vw) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const row = cands.find((el) => { const r = el.getBoundingClientRect(); return r.top > 120 && r.bottom < vh - 20; });
    if (${allowScroll} && row) row.scrollIntoView({ block: 'nearest', inline: 'center' });
    return null; })()`);
  let askPos = await findAsk(true);
  if (!askPos) { await sleep(500); askPos = await findAsk(false); }
  if (askPos) {
    out.push(await measure("openTicket", async () => {
      await press(askPos.x, askPos.y);
      for (let i = 0; i < 20 && !(await ev("!!document.querySelector('[role=dialog]')")); i++) await sleep(50);
      return ev("!!document.querySelector('[role=dialog]')");
    }));
    await S("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await S("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(500);
  } else out.push({ label: "openTicket", ok: false });

  // 2. Sort by Var. % (table only).
  if (!mobile) {
    const hdr = await ev(`(() => { const el = document.querySelector('.MuiDataGrid-columnHeader[data-field="changePercent"] .MuiDataGrid-columnHeaderTitle, .ag-header-cell[col-id="changePercent"] .ag-header-cell-label'); if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    out.push(hdr ? await measure("sort", () => mouse(hdr.x, hdr.y)) : { label: "sort", ok: false });
  }

  // 3. Type in the shared quick filter (re-filters the list on each key).
  const input = await ev(`(() => { const el = document.querySelector('input[aria-label="Filtrar instrumentos de la lista"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (input) {
    await press(input.x, input.y);
    out.push(await measure("filterTyping", async () => {
      for (const ch of "SQM") { await S("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch }); await S("Input.dispatchKeyEvent", { type: "keyUp", key: ch }); await sleep(120); }
    }));
  } else out.push({ label: "filterTyping", ok: false });
  return out;
}

// ---------------------------------------------------------------- soak (10 min heap / DOM growth)
async function soak(cdp, widget) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", ...(await newContext(cdp)) });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const S = (method, params) => cdp.send(method, params, sessionId);
  const ev = async (expression) => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
  try {
    await S("Page.enable"); await S("Runtime.enable"); await S("Performance.enable"); await S("HeapProfiler.enable");
    await S("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await S("Page.navigate", { url: `${BASE}/login` }); await sleep(3000);
    await ev(`localStorage.setItem("demo-tws-authenticated", "true")`);
    await S("Page.navigate", { url: `${BASE}/workstation?bench=1000&tps=100&widget=${widget}&profile=full&seed=${SEED}` });
    for (let i = 0; i < 240 && !(await ev(READY)); i++) await sleep(250);
    await sleep(5000);
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 <= 10 * 60 * 1000) {
      await S("HeapProfiler.collectGarbage");
      const m = Object.fromEntries((await S("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
      samples.push({ t: Math.round((Date.now() - t0) / 1000), heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners });
      log(`soak ${widget} t=${samples.at(-1).t}s heap=${samples.at(-1).heapMB}MB nodes=${samples.at(-1).nodes}`);
      await sleep(30000);
    }
    return { soak: true, widget, ok: true, samples };
  } finally {
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

// ---------------------------------------------------------------- main
const done = new Set(existsSync(OUT) ? readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok).map((r) => (r.soak ? `soak|${r.widget}` : keyOf(r))) : []);
let cdp;
try {
  cdp = await connect(await browserWs());
  if (chunk === "soak") {
    for (const widget of ["mui", "ag"]) {
      if (done.has(`soak|${widget}`)) continue;
      const r = await soak(cdp, widget);
      appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + "\n");
    }
  } else {
    const list = scenarios().filter((s) => !done.has(keyOf(s)));
    log(`chunk=${chunk} runs pendientes=${list.length}`);
    for (const [i, s] of list.entries()) {
      let r;
      try { r = await run(cdp, s); } catch (e) { r = { ...s, ok: false, error: String(e.message ?? e) }; }
      appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + "\n");
      const summaryLine = !r.ok
        ? `ERROR ${r.error}`
        : r.idle
          ? `fps=${r.idle.fps} p95=${r.idle.p95} busy=${r.idle.mainBusyPct}% tps=${r.idle.ticksPerSec} scrollFps=${r.scroll?.fps}`
          : `interactions=${JSON.stringify(r.interactions.map((x) => [x.label, x.ok ? x.maxEventMs : "fail"]))}`;
      log(`${i + 1}/${list.length} ${keyOf(s)} ${summaryLine}`);
    }
  }
} finally {
  cdp?.close(); chrome.kill(); await sleep(800);
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* locked */ }
}
