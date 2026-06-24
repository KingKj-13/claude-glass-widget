mod ccusage;
mod commands;
mod tray;
mod window;

use tauri::{Manager, WindowEvent};

/// Application entry point. Wires up plugins, the system tray, window geometry
/// persistence, and the command handlers exposed to the React frontend.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Single instance must be the first plugin registered. If a second copy
        // is launched, focus the existing widget instead of spawning a new one.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        // Launch-on-startup support (toggled from Settings via the JS plugin).
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let handle = app.handle().clone();

            // Build the system tray + menu.
            tray::create_tray(&handle)?;

            if let Some(win) = app.get_webview_window("main") {
                // Safety: always start interactive. (Click-through has been removed,
                // but this guarantees the window can never launch unclickable.)
                let _ = win.set_ignore_cursor_events(false);

                // Restore the saved position, or place the HUD top-right on first run.
                window::restore_or_place(&win);

                // Persist position when the widget loses focus or is closed, so a
                // crash/quit at any later point keeps the last good spot.
                let win_for_event = win.clone();
                win.on_window_event(move |event| match event {
                    WindowEvent::Focused(false) => window::save_position(&win_for_event),
                    WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed => {
                        window::save_position(&win_for_event)
                    }
                    WindowEvent::Moved(_) => { /* cheap: only persisted on blur/close */ }
                    _ => {}
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_usage,
            commands::ccusage_available,
            commands::set_always_on_top,
            commands::set_widget_size,
            commands::show_window,
            commands::hide_window,
            commands::minimize_window,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Claude Glass Widget");
}
