#!/usr/bin/env bash
# Runs tests/test.html in headless Chrome and fails on any FAIL/EXCEPTION.
# The single source of truth for how the browser suite is invoked: used by
# `npm run test:browser` locally and by both GitHub workflows.
set -euo pipefail
cd "$(dirname "$0")/.."

chrome="${CHROME_BIN:-}"
if [ -z "$chrome" ]; then
  for c in google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then chrome="$c"; break; fi
  done
fi
if [ -z "$chrome" ]; then
  echo "No Chrome/Chromium found on PATH; set CHROME_BIN" >&2
  exit 1
fi

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

"$chrome" --headless=new --disable-gpu --no-sandbox \
  --virtual-time-budget=8000 --dump-dom "file://$PWD/tests/test.html" \
  2>/dev/null > "$out/dom.html"
grep -o 'RESULTS::[^<]*' "$out/dom.html" | head -1 | tr '|' '\n' | sed '/^$/d' > "$out/results.txt"
cat "$out/results.txt"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo '### Browser test results'
    echo '```'
    cat "$out/results.txt"
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi

test -s "$out/results.txt"
! grep -qE 'FAIL|EXCEPTION' "$out/results.txt"
