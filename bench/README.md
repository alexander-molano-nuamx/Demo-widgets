# Benchmark del watchlist: MUI X vs AG Grid

Mide el rendimiento de los cuatro widgets watchlist con ticks en vivo, contra el **build de producción** desplegado en Vercel. Comparten datos, feed, diálogos y reglas; solo cambia la grilla:

| `widget` | Edición | Entrada |
|---|---|---|
| `mui` | MUI X Pro (wrapper nuam, tree data) | `WatchlistProPanel` |
| `mui-premium` | MUI X Premium (row grouping, selección de celdas, Excel), modo evaluación | `WatchlistPremiumPanel` |
| `ag` | AG Grid Enterprise, modo evaluación | `AgWatchlistEnterprisePanel` |
| `ag-community` | AG Grid Community: solo lo nativo (sin agrupación, menú contextual, side bar, set filter, sparklines ni columnas calculadas) | `AgWatchlistCommunityPanel` |

No tiene dependencias: controla el Chrome instalado en la máquina (headless) por CDP, con el `WebSocket` nativo de Node 22+.

## Requisitos

- Node 22 o superior.
- Google Chrome instalado. Ruta por defecto: `C:/Program Files/Google/Chrome/Application/chrome.exe` (cambiar con `CHROME_PATH`).
- El despliegue debe incluir el modo benchmark (`src/lib/watchlist/benchmark.ts`).
- Máquina lo más libre posible: cerrar el servidor dev y otras pestañas pesadas. Los valores absolutos dependen del hardware; las comparaciones entre widgets en la misma corrida son las confiables.

## Uso

```bash
node bench/matrix.mjs smoke 1          # prueba rápida: 1 corrida por widget (escribe smoke.jsonl)
node bench/matrix.mjs desktop-500-full # 60 corridas (4 widgets), ~55 min; también -core, o desktop-500 para ambos
node bench/matrix.mjs desktop-1000-full
node bench/matrix.mjs mobile-500       # 60 corridas, ~60 min (390×844, CPU 4× más lenta); mobile = ambos tamaños
node bench/matrix.mjs mobile-1000
node bench/matrix.mjs mobile-ticket    # solo interacción "abrir ticket" en móvil (repaso puntual)
node bench/matrix.mjs soak             # 10 min por widget, heap y nodos del DOM
node bench/analyze.mjs                 # medianas, rangos y criterios → summary.json
node bench/build-report.mjs            # informe HTML → report.html
```

En Git Bash, anteponer `MSYS_NO_PATHCONV=1` si se pasan rutas que empiezan con `/`.

Variables de entorno:

| Variable | Default | Para qué |
|---|---|---|
| `BENCH_BASE_URL` | `https://demo-widgets-xmxp-green.vercel.app` | Despliegue a medir |
| `BENCH_RESULTS` | `bench/results/current/` | Carpeta de resultados (ignorada en git) |
| `CHROME_PATH` | Chrome de Windows | Ejecutable de Chrome |
| `BENCH_WIDGETS` | `mui,mui-premium,ag,ag-community` | Widgets a medir (p. ej. `mui,ag` para repetir el baseline) |

`analyze.mjs` y `build-report.mjs` aceptan la carpeta como argumento, por ejemplo `node bench/analyze.mjs bench/results/2026-10-06`.

El runner es **reanudable**: si se corta, al volver a ejecutar el mismo bloque salta las corridas que ya están en `matrix.jsonl`.

## Qué mide

Cada corrida abre `/workstation?bench=N&tps=N&widget=mui|mui-premium|ag|ag-community&profile=full|core&seed=7`, que monta **solo** ese watchlist a pantalla completa y carga solo su chunk. Con la semilla fija, todos los widgets reciben exactamente la misma secuencia de ticks.

| Fase | Duración | Métricas |
|---|---|---|
| Carga | hasta las primeras filas | tiempo, JS ejecutado (decodificado) |
| Calentamiento | 5 s | — |
| Ticks sin interacción | 20 s | FPS, frame p50/p95/p99, long tasks, % del hilo ocupado, JS y layout por segundo, ticks entregados, flashes |
| Scroll continuo con ticks | 10 s | FPS, frame p95, frames en blanco |
| Interacción con ticks | — | Event Timing (base del INP): abrir ticket, ordenar por Var. %, escribir en el filtro |

Matriz: 500 y 1000 instrumentos × 25, 100 y 400 ticks/s × perfil `full` (las 34 capacidades) y `core` (sin sparkline, badges ni botones) × 5 repeticiones, rotando el orden de los widgets en cada repetición. En móvil solo `full`, porque las tarjetas son el mismo componente en todos los widgets.

Criterios de aprobación (en `analyze.mjs`): ticks entregados ≥ 95 %, frame p95 ≤ 50 ms, scroll ≥ 30 FPS, ningún long task > 200 ms, y en resistencia heap ≤ +10 %.

## Cuidado al leer los resultados

- **JS transferido no es comparable**: la librería MUI queda en caché desde la página de login. Se compara el JS ejecutado (decodificado).
- **Ordenar** tiene mucha variación entre repeticiones; tomarlo como indicativo.
- `report.template.html` tiene **texto de conclusiones escrito para la medición `2026-10-06-4ed`** (veredicto, notas por sección y próximos pasos). Las tablas y los gráficos se generan desde los datos, pero el texto hay que revisarlo y ajustarlo en cada medición nueva.

## Resultados guardados

- `results/2026-10-06/`: primera medición completa, MUI X Pro vs AG Grid Enterprise (Chrome headless en laptop i5-1335U con antivirus corporativo). Su informe quedó en `report.html` de esa carpeta.
- `results/2026-10-06-4ed/`: las 4 ediciones (360 corridas + 4 de resistencia, corrida nocturna). Informe publicado (reemplazó al anterior en el mismo enlace): https://claude.ai/artifact/XW4gCpsvckfBnk4Dh6MquN
