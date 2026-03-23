# Icons

Source icon: `../../icon.svg` (project root)

## Required Files

| File | Size | Usage |
|------|------|-------|
| `icon.ico` | 256,128,64,48,32,16 px | Windows app bundle icon |
| `icon.png` | 512x512 px | System tray icon |

## Generating Icons

### Option 1: Using the helper script
```bash
cd src-tauri/icons
cargo run --example create_icon
```

### Option 2: Manual conversion with ImageMagick
```bash
cd link
convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 src-tauri/icons/icon.ico
convert icon.svg -resize 512x512 src-tauri/icons/icon.png
```

### Option 3: Manual conversion with Inkscape
```bash
cd link
inkscape icon.svg --export-png=src-tauri/icons/icon.png --export-width=512
# For ICO, use an online converter or ImageMagick
```

## Icon Design

The icon shows:
- Dark circular background (#1a1a2e)
- Bright keyboard keys (#8a8ab5) - clearly visible
- Touchpad area at bottom
- Green wireless signal arcs indicating connectivity
- Green status dot in top right

## Win32 Console Version

For the console version (without Tauri), place `icon.ico` in:
- Same directory as the executable, OR
- `icons/icon.ico` relative to the executable
