# Desktop Build Instructions

This project remains a **web application first**. The Electron desktop builds are optional and don't affect the web version.

## How It Works

- **Web build**: Uses Vite to create standard web assets (same as before)
- **Desktop build**: Wraps the web build in an Electron container

## ✅ Quick Start

To generate a macOS .dmg installer:

```bash
npm run build:mac
```

The installer will be in `release/Ductape Workbench-0.0.0.dmg` (and `-arm64.dmg` for Apple Silicon)

## Installation

Install the desktop build dependencies (one time):

```bash
npm install
```

This adds `electron` and `electron-builder` as dev dependencies.

## Available Commands

### Web Development (unchanged)
```bash
npm run dev          # Start dev server (web only)
npm run build        # Build for web deployment
npm run preview      # Preview web build
```

### Desktop Builds (new optional commands)
```bash
npm run build:desktop    # Build for all platforms
npm run build:mac        # Build .dmg for macOS (x64 + arm64)
npm run build:win        # Build .exe installer for Windows
npm run build:linux      # Build AppImage and .deb for Linux
```

## Output

Desktop builds will be created in the `release/` folder:
- **macOS**: `Ductape Workbench-{version}.dmg`
- **Windows**: `Ductape Workbench Setup {version}.exe`
- **Linux**: `ductape-workbench-{version}.AppImage` and `.deb`

## Icons (Optional)

Place app icons in the `public/` folder:
- `public/icon.icns` - macOS icon
- `public/icon.ico` - Windows icon
- `public/icon.png` - Linux icon (512x512 or 1024x1024)

If icons are missing, Electron will use default icons.

## Notes

- The desktop app simply loads your built web application
- All web features work identically in the desktop version
- The desktop version doesn't require any code changes
- Web deployment is completely unaffected
- Electron files (`electron-main.js`, `electron-builder.json`) are only used for desktop builds

## Platform-Specific Building

You can only build for your current platform unless you use CI/CD:
- On **macOS**: Can build .dmg (macOS only)
- On **Windows**: Can build .exe (Windows only)
- On **Linux**: Can build AppImage and .deb (Linux only)

For multi-platform builds, use GitHub Actions or other CI/CD tools.
