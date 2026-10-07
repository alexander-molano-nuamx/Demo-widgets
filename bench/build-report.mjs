// Builds the HTML report from <dir>/summary.json (run analyze.mjs first). Writes <dir>/report.html.
// Usage: node bench/build-report.mjs [dir]   (default bench/results/current)
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = process.argv[2] ? pathToFileURL(resolve(process.argv[2]) + "/") : new URL("./results/current/", import.meta.url);
const summary = JSON.parse(readFileSync(new URL("./summary.json", DIR), "utf8"));
const date = summary.totals.firstRunAt
  ? new Date(summary.totals.firstRunAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })
  : "—";
const runs = [
  `<strong>${summary.totals.ok}</strong> corridas de matriz`,
  summary.totals.mobileTicket ? `${summary.totals.mobileTicket} de interacción móvil` : null,
  summary.totals.soak ? `${summary.totals.soak} de resistencia` : null,
].filter(Boolean).join(" + ");

let html = readFileSync(new URL("./report.template.html", import.meta.url), "utf8")
  .replace("/*__DATA__*/null", JSON.stringify({ widgets: summary.widgets, scenarios: summary.scenarios, criteria: summary.criteria, soak: summary.soak }))
  .replace("<strong>__RUNS__</strong> corridas · 5 repeticiones por escenario", `${runs} · 5 repeticiones por escenario`)
  .replace("__DATE__", date);

const leftover = html.match(/__[A-Z_]+__/);
if (leftover) throw new Error(`Placeholder sin reemplazar en la plantilla: ${leftover[0]}`);
// Fail fast on a broken inline script instead of publishing a blank report.
new Function(html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>")));

writeFileSync(new URL("./report.html", DIR), html);
console.log(`Informe: ${new URL("./report.html", DIR).pathname}`);
