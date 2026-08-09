#!/bin/bash
# Assembles src/ into:
#   index.html    — standalone app (open locally or host anywhere)
#   artifact.html — fragment for Claude Artifact publishing (no doctype/html/head/body)
set -euo pipefail
cd "$(dirname "$0")"

JS="$(cat src/data.js src/demos.js src/core.js src/ui.js)"
CSS="$(cat src/styles.css)"

# --- artifact fragment ---
{
  echo '<title>FORGE — Home Gym</title>'
  echo '<style>'
  echo "$CSS"
  echo '</style>'
  echo '<div id="forge-bg"></div>'
  echo '<div id="app"></div>'
  echo '<script>'
  echo "$JS"
  echo '</script>'
} > artifact.html

# --- standalone ---
{
  echo '<!doctype html>'
  echo '<html lang="en">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<meta name="apple-mobile-web-app-capable" content="yes">'
  echo '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  echo '<meta name="apple-mobile-web-app-title" content="FORGE">'
  echo '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f1ea">'
  echo '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#131110">'
  echo '<title>FORGE — Home Gym</title>'
  echo '<style>'
  echo "$CSS"
  echo '</style>'
  echo '</head>'
  echo '<body>'
  echo '<div id="forge-bg"></div>'
  echo '<div id="app"></div>'
  echo '<script>'
  echo "$JS"
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > index.html

echo "Built: index.html ($(wc -c < index.html | tr -d ' ') bytes), artifact.html ($(wc -c < artifact.html | tr -d ' ') bytes)"
