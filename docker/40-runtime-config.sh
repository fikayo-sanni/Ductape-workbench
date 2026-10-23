#!/bin/sh
# Runs when the Workbench container starts (nginx runs every executable *.sh in /docker-entrypoint.d/).
# Writes config.js so the API address is chosen when the container starts, not when the image was built. That is what
# lets one published image serve any domain.
set -eu

target=/usr/share/nginx/html/config.js
url="${DUCTAPE_PUBLIC_URL:-}"

if [ -n "$url" ]; then
  # Keep it a JSON string: escape backslashes and double quotes.
  escaped=$(printf '%s' "$url" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf 'window.__DUCTAPE_CONFIG__ = { apiBaseUrl: "%s" };\n' "$escaped" > "$target"
else
  printf 'window.__DUCTAPE_CONFIG__ = window.__DUCTAPE_CONFIG__ || {};\n' > "$target"
fi
