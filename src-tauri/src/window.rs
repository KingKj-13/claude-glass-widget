//! Window geometry helpers: top-right placement on first run and lightweight
//! position persistence (no extra plugin needed).

use std::fs;
use std::path::PathBuf;

use serde_json::json;
use tauri::{Manager, PhysicalPosition, Runtime, WebviewWindow};

/// Margin (logical px) kept from the screen edges when auto-placing.
const EDGE_MARGIN: i32 = 24;

fn position_file<R: Runtime>(win: &WebviewWindow<R>) -> Option<PathBuf> {
    win.app_handle()
        .path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("window-position.json"))
}

/// Restore the previously saved position, or place the widget in the top-right
/// corner of the active monitor when there is no saved state.
pub fn restore_or_place<R: Runtime>(win: &WebviewWindow<R>) {
    if let Some(path) = position_file(win) {
        if let Ok(text) = fs::read_to_string(&path) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                if let (Some(x), Some(y)) = (
                    v.get("x").and_then(|x| x.as_i64()),
                    v.get("y").and_then(|y| y.as_i64()),
                ) {
                    if within_some_monitor(win, x as i32, y as i32) {
                        let _ = win.set_position(PhysicalPosition::new(x as i32, y as i32));
                        return;
                    }
                }
            }
        }
    }
    place_top_right(win);
}

/// Place the widget against the top-right corner of the current monitor.
pub fn place_top_right<R: Runtime>(win: &WebviewWindow<R>) {
    let Ok(Some(monitor)) = win.current_monitor() else {
        return;
    };
    let scale = monitor.scale_factor();
    let screen = monitor.size();
    let origin = monitor.position();
    let margin = (EDGE_MARGIN as f64 * scale) as i32;

    if let Ok(size) = win.outer_size() {
        let x = origin.x + screen.width as i32 - size.width as i32 - margin;
        let y = origin.y + margin;
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
}

/// Persist the window's current outer position to disk.
pub fn save_position<R: Runtime>(win: &WebviewWindow<R>) {
    let Some(path) = position_file(win) else {
        return;
    };
    if let Ok(pos) = win.outer_position() {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&path, json!({ "x": pos.x, "y": pos.y }).to_string());
    }
}

/// Guard against restoring a position that is off every connected monitor
/// (e.g. an external display was unplugged since last run).
fn within_some_monitor<R: Runtime>(win: &WebviewWindow<R>, x: i32, y: i32) -> bool {
    let Ok(monitors) = win.available_monitors() else {
        return true; // can't verify -> trust the saved value
    };
    monitors.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        x >= p.x - 50
            && y >= p.y - 50
            && x < p.x + s.width as i32
            && y < p.y + s.height as i32
    })
}
