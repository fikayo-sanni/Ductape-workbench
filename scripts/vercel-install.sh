#!/bin/bash
set -e

echo "Installing dependencies for Vercel..."

# Install dependencies but skip node-expat postinstall
npm install --legacy-peer-deps --ignore-scripts

# Manually install rollup's native bindings
echo "Installing Rollup native bindings..."
cd node_modules/rollup
npm install --ignore-scripts=false
cd ../..

# Install vite's native dependencies if needed
if [ -d "node_modules/vite" ]; then
  echo "Installing Vite dependencies..."
  cd node_modules/vite
  npm install --ignore-scripts=false || true
  cd ../..
fi

echo "Install complete!"
