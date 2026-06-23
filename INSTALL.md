# Installation Guide — Claude Glass Widget

This guide covers building and installing the widget from source on **Windows**
(primary) and **macOS / Linux**.

---

## 1. Prerequisites

### 1.1 Node.js (≥ 18)

Download from <https://nodejs.org> (LTS) or via a version manager. Verify:

```bash
node --version
npm --version
```

### 1.2 Rust toolchain

The Tauri backend is compiled with Rust. Install via **rustup**:

- Windows: download and run <https://win.rustup.rs> (or `winget install Rustlang.Rustup`)
- macOS / Linux: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

Then verify:

```bash
rustc --version
cargo --version
```

### 1.3 Platform build dependencies

**Windows**
- **Microsoft C++ Build Tools** — install "Desktop development with C++"
  from the Visual Studio Build Tools installer
  (<https://visualstudio.microsoft.com/visual-cpp-build-tools/>).
- **WebView2 Runtime** — preinstalled on Windows 11. If missing, the generated
  installer will bootstrap it, or grab the Evergreen runtime from Microsoft.

**macOS**
- Xcode Command Line Tools: `xcode-select --install`

**Linux**
- `webkit2gtk` and friends — see the Tauri prerequisites page for your distro:
  <https://tauri.app/start/prerequisites/>

### 1.4 ccusage (the data source)

```bash
npm install -g ccusage
ccusage --version
```

> The widget also works if ccusage is only available via `npx` — it falls back
> to `npx ccusage@latest` automatically. Make sure you've used Claude Code at
> least once so usage logs exist.

---

## 2. Get the code & install JS dependencies

```bash
cd "Claude token app"
npm install
```

> **Note (sandboxed/CI shells):** if `npm install` fails during the esbuild
> postinstall with `ERR_INVALID_ARG_TYPE … "file" … undefined`, your shell is
> missing the `ComSpec` environment variable. Set it and retry:
> ```powershell
> $env:ComSpec = "C:\Windows\System32\cmd.exe"
> npm install
> ```
> A normal Windows terminal already has this set.

---

## 3. Run in development

```bash
npm run app:dev
```

This compiles the Rust backend (first run takes a few minutes), starts Vite, and
opens the floating widget. Hot-reload is active for the React side.

To preview just the UI in a browser with mock data (no Rust required):

```bash
npm run dev          # then open http://localhost:1420
```

---

## 4. Build installers

```bash
npm run app:build
```

Artifacts are written to:

```
src-tauri/target/release/bundle/
├─ nsis/Claude Glass Widget_1.0.0_x64-setup.exe
└─ msi/Claude Glass Widget_1.0.0_x64_en-US.msi
```

Run either installer. After install:

- The widget appears in the **top-right corner** on first launch.
- A **tray icon** lets you Show / Hide / Refresh / open Settings / Quit.
- Enable **Launch on Startup** in Settings to have it start with Windows.

---

## 5. Regenerating icons (optional)

All icons are generated procedurally — no design tool needed:

```bash
node scripts/generate-icons.mjs
```

This writes the PNG set, `icon.ico` and `icon.icns` into `src-tauri/icons/`.

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| "No Claude Usage Data Available" | Install ccusage (`npm i -g ccusage`) and use Claude Code at least once, then hit **Retry**. |
| Numbers look off for your plan | Set the `CLAUDE_*` env vars (see README → Tuning limits). |
| Widget invisible / can't click it | You may have **Click-Through** on — disable it from the **tray → Settings**. |
| Widget off-screen after unplugging a monitor | It auto-falls back to the top-right of the primary monitor; or delete `window-position.json` in the app config dir. |
| `cargo` not found | Install Rust (step 1.2) and restart your terminal. |
| Build fails on Windows with linker errors | Install the C++ Build Tools (step 1.3). |
| Blank white window in dev | A Rust/JS error occurred — check the terminal; ensure `npm install` completed. |

---

## 7. Uninstall

Use **Windows → Settings → Apps** (or the MSI/NSIS uninstaller). To also remove
saved state, delete the app's config folder:

```
%APPDATA%\com.claudeglass.widget\
```
