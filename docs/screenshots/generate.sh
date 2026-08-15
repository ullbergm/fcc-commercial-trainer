#!/usr/bin/env bash
# Regenerates docs/screenshots/*.png from the live app.
#
# Each image is one capture per theme, composited across the diagonal: light
# in the upper-left triangle, dark in the lower-right. The app is fed a seeded
# demo profile (seed.js) through a throwaway copy of index.html, so the same
# run always produces the same picture.
#
# Needs Chrome or Chromium (CHROME_BIN, or on PATH) and ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/../.."

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
magick="$(command -v magick || command -v convert || true)"
if [ -z "$magick" ]; then
  echo "ImageMagick not found on PATH" >&2
  exit 1
fi

page='.screenshot-page.html'
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp" "$page"' EXIT

# index.html with the demo profile injected ahead of the app itself.
sed 's|<script src="js/app.js">|<script src="docs/screenshots/seed.js"></script>\n  <script src="js/app.js">|' \
  index.html > "$page"

WIDTH=900
render() { # url -> png
  "$chrome" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-color-profile=srgb --force-device-scale-factor=2 \
    --window-size="$WIDTH,$3" --virtual-time-budget=5000 \
    --screenshot="$2" "$1" >/dev/null 2>&1
}

shoot() { # view
  local view="$1" url height
  url="file://$PWD/$page?theme=light#$view"
  # The page reports its own rendered height in the title; capturing at that
  # height is what makes these full-page shots rather than viewport crops.
  height="$("$chrome" --headless=new --disable-gpu --no-sandbox \
    --window-size="$WIDTH,900" --virtual-time-budget=5000 --dump-dom "$url" 2>/dev/null \
    | sed -n 's|.*<title>shot \([0-9]*\)</title>.*|\1|p' | head -1)"
  if [ -z "$height" ]; then
    echo "could not measure the $view page; is the app rendering?" >&2
    exit 1
  fi
  render "$url" "$tmp/$view-light.png" "$height"
  render "file://$PWD/$page?theme=dark#$view" "$tmp/$view-dark.png" "$height"

  # Cut the light capture down to the upper-left triangle, then lay it over
  # the dark one: corner to corner, top right down to bottom left.
  read -r w h <<<"$("$magick" identify -format '%w %h' "$tmp/$view-light.png")"
  "$magick" -size "${w}x${h}" xc:black -fill white \
    -draw "polygon 0,0 $((w - 1)),0 0,$((h - 1))" "$tmp/mask.png"
  "$magick" "$tmp/$view-light.png" "$tmp/mask.png" -alpha off \
    -compose CopyOpacity -composite "$tmp/$view-tri.png"
  "$magick" "$tmp/$view-dark.png" "$tmp/$view-tri.png" -compose Over \
    -composite -strip "docs/screenshots/$view.png"
  echo "docs/screenshots/$view.png  ${w}x${h}"
}

for view in "$@"; do shoot "$view"; done
