# fsv-tauri

<p align="center">
  <img src="public/icon.ico" width="128" alt="fsv logo" />
</p>

[![GitHub](https://img.shields.io/badge/GitHub-ahaoboy/fsv-blue?logo=github)](https://github.com/ahaoboy/fsv)

A native desktop & Android GUI for [fsv](https://github.com/ahaoboy/fsv) — a fast, lightweight
file server built in Rust. Pick a directory, start the server, and share files over HTTP with
real-time WebSocket broadcasting — all from a compact mobile-first UI.

Built with [Tauri 2](https://tauri.app/), [React 19](https://react.dev/), and
[Material UI 9](https://mui.com/).

## Download

[![Latest Release](https://img.shields.io/github/v/release/ahaoboy/fsv-tauri?label=Latest&logo=github)](https://github.com/ahaoboy/fsv-tauri/releases/latest)

Download the latest version from the [Releases page](https://github.com/ahaoboy/fsv-tauri/releases/latest).

| Platform | Formats                                        |
| -------- | ---------------------------------------------- |
| Windows  | `.msi` · `.exe` setup · portable `.exe`        |
| macOS    | `.dmg` · `.app.tar.gz` (Apple Silicon / Intel) |
| Linux    | `.deb` · `.rpm` · `.AppImage` · raw binary     |
| Android  | `.apk` · `.aab`                                |

## Features

- **One-tap server** — pick a directory, set a port, start serving files instantly
- **Real-time broadcasting** — push messages to all connected web clients via WebSocket
- **QR code sharing** — generate a QR code so mobile clients can scan and connect
- **Auto-open browser** — opens the web UI in your default browser on start
- **Hash-route URLs** — shareable URLs like `http://host:port/#/path/to/folder`
- **File preview** — built-in preview for text, images, video, and audio files
- **Cross-platform** — runs on Windows, macOS, Linux desktop and Android
- **Dark / light theme** — automatically follows your system preference via MUI
- **Mobile-first UI** — responsive layout with Material UI, zero custom CSS

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Core library | [fsv](https://github.com/ahaoboy/fsv) (Rust)        |
| Desktop GUI  | Tauri 2 (Rust) + React 19 + MUI 9 + TypeScript      |
| Build tool   | Vite 8                                              |
| QR code      | [node-qrcode](https://www.npmjs.com/package/qrcode) |

## License

[MIT](https://github.com/ahaoboy/fsv/blob/main/LICENSE)
