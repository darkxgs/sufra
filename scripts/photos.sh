#!/usr/bin/env bash
# Menu photos for Jamr, the demo restaurant. They were generated for this demo
# (Jamr is fictional) and live on the image host they were made on; this
# downloads them once and writes the sizes the menu asks for:
#   dishes: <slug>-400.webp and <slug>-900.webp (square)
#   cover:  cover-800.webp and cover-1600.webp (3:2)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="public/photos"
mkdir -p "$OUT" .cache
grep -v '^#' scripts/photos.txt | while read -r slug url; do
  [ -n "$slug" ] || continue
  [ -f ".cache/$slug.png" ] || curl -fsSL --retry 3 -o ".cache/$slug.png" "$url"
  if [ "$slug" = "cover" ]; then
    for w in 800 1600; do convert ".cache/$slug.png" -resize "${w}x" -strip -quality 78 "$OUT/$slug-$w.webp"; done
  else
    for w in 400 900; do convert ".cache/$slug.png" -resize "${w}x${w}^" -gravity center -extent "${w}x${w}" -strip -quality 80 "$OUT/$slug-$w.webp"; done
  fi
done
ls -la "$OUT" | head -60
