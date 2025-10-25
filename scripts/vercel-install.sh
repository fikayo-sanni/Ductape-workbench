#!/bin/bash
set -e

echo "Installing dependencies for Vercel..."

# Install dependencies normally - the node-expat override should prevent issues
npm install --legacy-peer-deps

echo "Install complete!"
