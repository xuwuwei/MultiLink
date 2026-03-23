# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remote keyboard/touchpad app: an Android/iOS phone acts as a wireless keyboard and touchpad for a Windows PC.

- **`app/`** — React 19 + TypeScript frontend (Capacitor H5 app, runs on Android/iOS)
- **`link/`** — Rust backend (runs on the PC, simulates input via Windows SendInput API)

## Commands

### Frontend (`app/`)
```bash
cd app
npm run dev        # Dev server on port 3000 (network-accessible)
npm run build      # Production build (required before cap sync)
npm run lint       # TypeScript type-check (tsc --noEmit)

# Android
npx cap sync       # Sync web assets to Android project after build
npx cap open android   # Open in Android Studio
```

### Backend (`link/`)
```bash
cd link
cargo run                    # Console version
cargo build --release        # Release build
cargo tauri dev              # Tauri desktop app (dev)
```

## Architecture

### System Overview
```
Android (Capacitor app)
  └── H5 (React UI)
      ├── Keyboard → onKeyAction → networkService.sendKeyTap(hidCode)
      └── Touchpad → networkService.sendMouseMove/sendMouseScroll (direct)
                  → onMouseAction('LM'/'RM') → networkService.sendMouseClick
          ↓ TCP long connection (port 8081, JSON+\n framing)
PC (Rust server, link/)
  └── network.rs → buffer.rs → driver.rs → Windows SendInput()
```

### TCP Protocol
Messages are newline-delimited JSON. Each message:
```json
{"event":{"KeyDown":4},"timestamp":1712345678901}
{"event":{"KeyUp":4},"timestamp":1712345678901}
{"event":{"MouseMove":[5,-3]},"timestamp":1712345678901}
{"event":{"MouseButton":[1,true]},"timestamp":1712345678901}
{"event":{"MouseScroll":1},"timestamp":1712345678901}
```
`MouseButton` mask: `0x01`=left, `0x02`=right, `0x04`=middle.

### Frontend (`app/src/`)
- **`App.tsx`** — Root: device management, `handleKeyAction` sends `networkService.sendKeyTap(hidCode)` on press; `handleMouseAction` sends `sendMouseClick` for LM/RM
- **`components/Keyboard.tsx`** — Virtual keyboard; calls `onKeyAction(label)` on press (keydown + keyup sent together as a tap)
- **`components/Touchpad.tsx`** — Touch gesture handling; calls `networkService.sendMouseMove/sendMouseScroll` **directly** in the 100Hz polling loop (no extra callback)
- **`constants.ts`** — `HID_CODES` map: key label → USB HID usage byte
- **`services/networkService.ts`** — Singleton managing TCP connection state, auto-reconnect with exponential backoff, serializes events to `NetworkMessage` JSON
- **`plugins/TcpSocket.ts`** — Capacitor plugin interface (TypeScript); registered as `'TcpSocket'` with web fallback stub
- **`services/deviceService.ts`** — Device list; `ip` + `port` used by networkService to connect

### Android Native Plugin (`app/android/`)
- **`plugins/TcpSocketPlugin.kt`** — Kotlin Capacitor plugin
  - `connect(host, port)` — TCP connect with `tcpNoDelay=true`; monitors connection in background coroutine; fires `stateChange` event on disconnect
  - `send(data)` — writes JSON string + `\n` on IO thread
  - `disconnect()` — closes socket
- **`MainActivity.java`** — registers `TcpSocketPlugin` via `registerPlugin()`
- Uses `kotlinx-coroutines-android` for async IO

### Backend (`link/src/`)
- **`main.rs`** — Tokio async loop; TCP port 8081, UDP port 8080
- **`network.rs`** — `KeyboardEvent` enum (KeyDown/KeyUp/KeyCombo/Text/MouseMove/MouseButton/MouseScroll); TCP handler reads line-by-line via `BufReader`
- **`driver.rs`** — `send_key_press/release`, `send_mouse_move`, `send_mouse_button`, `send_mouse_scroll` via Win32 `SendInput()`
- **`buffer.rs`** — Jitter buffer + debouncer (5ms) + smoother for network event ordering
- **`scancode.rs`** — HID byte → Windows Virtual Key mapping
