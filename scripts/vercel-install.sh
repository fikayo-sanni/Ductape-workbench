#!/bin/bash
set -e

echo "Installing dependencies for Vercel..."

# Remove node-expat from package-lock if it exists
if [ -f "package-lock.json" ]; then
  echo "Cleaning package-lock.json..."
  rm -f package-lock.json
fi

# Install with overrides
echo "Running npm install with overrides..."
npm install --legacy-peer-deps --ignore-scripts

# Rebuild only necessary packages (rollup, vite, etc) but not node-expat
echo "Rebuilding necessary native modules..."
npm rebuild rollup --legacy-peer-deps || echo "Note: Rollup rebuild completed"
npm rebuild esbuild --legacy-peer-deps || echo "Note: esbuild rebuild completed"

echo "Install complete!"
