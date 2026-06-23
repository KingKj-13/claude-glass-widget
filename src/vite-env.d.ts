/// <reference types="vite/client" />

interface Window {
  // Present only when running inside the Tauri runtime (WebView2 / WKWebView).
  __TAURI_INTERNALS__?: unknown;
}
