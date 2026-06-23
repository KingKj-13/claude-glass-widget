//! Commands invoked from the React frontend over Tauri IPC.

use serde_json::Value;
use tauri::{AppHandle, PhysicalPosition, PhysicalSize, Runtime, WebviewWindow};

use crate::ccusage;
use crate::window;

/// Fetch a fully normalized usage snapshot (runs ccusage off the UI thread).
#[tauri::command]
pub async fn get_usage() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(ccusage::build_snapshot)
        .await
        .map_err(|e| e.to_string())?
}

/// Cheap probe for whether the ccusage CLI is reachable.
#[tauri::command]
pub async fn ccusage_available() -> bool {
    tauri::async_runtime::spawn_blocking(ccusage::is_available)
        .await
        .unwrap_or(false)
}

#[tauri::command]
pub fn set_always_on_top<R: Runtime>(
    window: WebviewWindow<R>,
    value: bool,
) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_click_through<R: Runtime>(
    window: WebviewWindow<R>,
    value: bool,
) -> Result<(), String> {
    window
        .set_ignore_cursor_events(value)
        .map_err(|e| e.to_string())
}

/// Resize the widget while keeping its top-right corner anchored, so expanding
/// grows the card down-and-left (matching the floating-HUD feel).
#[tauri::command]
pub fn set_widget_size<R: Runtime>(
    window: WebviewWindow<R>,
    width: f64,
    height: f64,
    _animate: bool,
) -> Result<(), String> {
    let scale = window.scale_factor().unwrap_or(1.0);
    let new_w = (width * scale).round().max(1.0) as i32;
    let new_h = (height * scale).round().max(1.0) as i32;

    let cur_pos = window.outer_position().map_err(|e| e.to_string())?;
    let cur_size = window.outer_size().map_err(|e| e.to_string())?;

    // Shift the left edge so the right edge stays put.
    let mut new_x = cur_pos.x + (cur_size.width as i32 - new_w);
    let mut new_y = cur_pos.y;

    // Keep the (possibly larger) window fully on its monitor.
    if let Ok(Some(monitor)) = window.current_monitor() {
        let origin = monitor.position();
        let screen = monitor.size();
        let max_x = origin.x + screen.width as i32 - new_w - 8;
        let max_y = origin.y + screen.height as i32 - new_h - 8;
        new_x = new_x.clamp(origin.x + 8, max_x.max(origin.x + 8));
        new_y = new_y.clamp(origin.y + 8, max_y.max(origin.y + 8));
    }

    window
        .set_size(PhysicalSize::new(new_w as u32, new_h as u32))
        .map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(new_x, new_y))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn show_window<R: Runtime>(window: WebviewWindow<R>) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window<R: Runtime>(window: WebviewWindow<R>) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit_app<R: Runtime>(app: AppHandle<R>, window: WebviewWindow<R>) {
    window::save_position(&window);
    app.exit(0);
}
