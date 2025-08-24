use tauri::Manager;
use std::thread;

// Modules
mod meeting_detector;
mod commands;
mod services;
mod tray;
mod app_config;
mod state;
mod audio_system;
mod events;

// Re-exports
pub use commands::*;
pub use state::*;
use events::EventEmitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize app state
            let app_state = AppState::default();
            
            // Initialize audio system
            if let Err(e) = app_state.initialize_audio_system() {
                eprintln!("Failed to initialize audio system: {}", e);
            } else {
                println!("Audio system initialized successfully");
            }
            
            // Start meeting detection automatically
            if let Err(e) = app_state.meeting_detector.start_monitoring() {
                eprintln!("Failed to start meeting detection: {}", e);
            } else {
                println!("Meeting detection started");
            }
            
            // Set up auto-recording notification when meeting is detected
            let detector_clone = app_state.meeting_detector.clone();
            let app_handle_clone = app.handle().clone();
            thread::spawn(move || {
                let mut was_in_meeting = false;
                let mut notification_shown = false;
                
                loop {
                    let meeting_state = detector_clone.get_state();
                    
                    if meeting_state.is_in_meeting && !was_in_meeting {
                        // Meeting just started - show notification popup
                        println!("Meeting detected: {:?}", meeting_state.detected_app);
                        
                        if !notification_shown {
                            // Show the notification window
                            if let Some(notification_window) = app_handle_clone.get_webview_window("notification") {
                                println!("Found notification window, showing...");
                                
                                let _ = notification_window.show();
                                
                                // Dynamically position window at top-center
                                if let Ok(monitor) = notification_window.current_monitor() {
                                    if let Some(monitor) = monitor {
                                        let screen_size = monitor.size();
                                        let screen_width = screen_size.width as i32;
                                        
                                        // Get window size
                                        if let Ok(window_size) = notification_window.outer_size() {
                                            let window_width = window_size.width as i32;
                                            
                                            // Calculate top-right position
                                            let x = screen_width - window_width - 20; // 20px margin from right edge
                                            let y = 50; // 50px from top
                                            
                                            let _ = notification_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
                                            println!("Positioned notification window at ({}, {}) - Screen width: {}, Window width: {}", 
                                                     x, y, screen_width, window_width);
                                        }
                                    }
                                }
                                
                                let _ = notification_window.set_focus();
                                println!("Notification window shown and focused");
                                notification_shown = true;
                                
                                // Emit event to update the notification content
                                EventEmitter::meeting_detected(&app_handle_clone, &meeting_state);
                            }
                        }
                    } else if !meeting_state.is_in_meeting && was_in_meeting {
                        // Meeting just ended
                        println!("Meeting ended");
                        notification_shown = false;
                        
                        // Hide notification if still open
                        if let Some(notification_window) = app_handle_clone.get_webview_window("notification") {
                            let _ = notification_window.hide();
                        }
                        
                        EventEmitter::meeting_ended(&app_handle_clone);
                        }
                        
                    was_in_meeting = meeting_state.is_in_meeting;
                    thread::sleep(std::time::Duration::from_secs(2));
                }
            });
            
            app.manage(app_state);
            
            // Setup system tray
            tray::setup_system_tray(&app.handle()).map_err(|e| {
                eprintln!("Failed to setup system tray: {}", e);
                e
            })?;
            
            // Handle window events
            if let Some(window) = app.get_webview_window("main") {
                // Handle close event - hide instead of close
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
                
                // Hide main window initially (it will show when tray is clicked or dock icon is clicked)
                window.hide()?;
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            pause_recording,
            resume_recording,
            stop_recording,
            get_recent_recordings,
            get_recording_state,
            toggle_recording,
            play_recording,
            stop_playback,
            get_playback_state,
            delete_recording,
            load_recordings_from_disk,
            open_recordings_folder,
            start_meeting_detection,
            stop_meeting_detection,
            get_meeting_state,
            transcribe_recording_stream,
            get_config,
            update_config,
            reset_config
        ])
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Don't close the window, hide it instead to keep the app running
                    api.prevent_close();
                    window.hide().unwrap();
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            match event {
                tauri::RunEvent::Reopen { has_visible_windows, .. } => {
                    // Handle dock icon click when app has no visible windows
                    if !has_visible_windows {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                            // On macOS, also unminimize if needed
                            #[cfg(target_os = "macos")]
                            let _ = window.unminimize();
                        }
                    }
                }
                _ => {}
            }
        });
}