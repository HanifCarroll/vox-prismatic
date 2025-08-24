use tauri::{AppHandle, Manager};
use crate::events::EventEmitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};

// Function to update tray menu based on recording state
pub fn update_tray_menu(app: &AppHandle, is_recording: bool) -> Result<(), Box<dyn std::error::Error>> {

    // Create tray menu items with dynamic text
    let open_window = MenuItemBuilder::with_id("open_window", "Open App Window").build(app)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let recording_text = if is_recording { "Stop Recording" } else { "Start Recording" };
    let start_stop_recording = MenuItemBuilder::with_id("start_stop_recording", recording_text).build(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    
    let menu = MenuBuilder::new(app)
        .items(&[
            &open_window,
            &separator1, 
            &start_stop_recording,
            &separator2,
            &quit
        ])
        .build()?;
    
    // Update the tray icon's menu
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}

// System tray setup
pub fn setup_system_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButtonState};
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};

    // Create tray menu items
    let open_window = MenuItemBuilder::with_id("open_window", "Open App Window").build(app)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let start_stop_recording = MenuItemBuilder::with_id("start_stop_recording", "Start Recording").build(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    
    let menu = MenuBuilder::new(app)
        .items(&[
            &open_window,
            &separator1, 
            &start_stop_recording,
            &separator2,
            &quit
        ])
        .build()?;

    // Load tray icon from bytes (embedded in binary)
    let icon_bytes = include_bytes!("../../icons/icon.png");
    let icon = tauri::image::Image::from_bytes(icon_bytes)?;

    let _tray = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .icon(icon)
        .on_tray_icon_event(|_tray, event| {
            match event {
                TrayIconEvent::Click { button_state, .. } => {
                    if let MouseButtonState::Up = button_state {
                        // Handle tray click
                    }
                }
                _ => {}
            }
        })
        .on_menu_event(move |app_handle, event| {
            match event.id().as_ref() {
                "open_window" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "start_stop_recording" => {
                    let app_handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Some(state) = app_handle.try_state::<crate::AppState>() {
                            match crate::commands::toggle_recording(state, app_handle.clone()).await {
                                Ok(message) => {
                                    println!("{}", message);
                                    // Emit event to notify frontend of state change
                                    EventEmitter::recording_state_changed(&app_handle);
                                },
                                Err(e) => println!("Recording error: {}", e),
                            }
                        }
                    });
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}