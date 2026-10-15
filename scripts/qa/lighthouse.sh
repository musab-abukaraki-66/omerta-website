#!/usr/bin/env bash
# Repeatable Lighthouse runs. Usage: scripts/qa/lighthouse.sh <outDir> <url> <runs>
# Needs `lighthouse` resolvable via npx and CHROME_PATH pointing at a Chromium binary.
set -u
OUT=$1; URL=$2; RUNS=${3:-3}
mkdir -p "$OUT"
FLAGS='--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader'
for mode in mobile-applied mobile-simulated desktop; do
  case $mode in
    mobile-applied) EXTRA="--throttling-method=devtools" ;;
    mobile-simulated) EXTRA="" ;;
    desktop) EXTRA="--preset=desktop" ;;
  esac
  for i in $(seq 1 "$RUNS"); do
    npx lighthouse "$URL" $EXTRA --quiet --chrome-flags="$FLAGS" --output=json --output=html \
      --output-path="$OUT/$mode-$i" >/dev/null 2>&1
  done
done
python3 -I - "$OUT" <<'PY'
import json, glob, sys, statistics as st, os
out = sys.argv[1]
for mode in ['mobile-applied', 'mobile-simulated', 'desktop']:
    rs = [json.load(open(f)) for f in sorted(glob.glob(f'{out}/{mode}-*.report.json'))]
    if not rs: continue
    g = lambda k: [r['audits'][k]['numericValue'] for r in rs]
    perf = [round(r['categories']['performance']['score'] * 100) for r in rs]
    a11y = [round(r['categories']['accessibility']['score'] * 100) for r in rs]
    print(f"{mode:17} perf {perf} a11y {a11y} | TBT ms {[round(x) for x in g('total-blocking-time')]} median {round(st.median(g('total-blocking-time')))} | LCP ms median {round(st.median(g('largest-contentful-paint')))} | CLS max {max(g('cumulative-layout-shift')):.3f}")
PY
