use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use chrono::{DateTime, Utc};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recording {
    pub id: String,
    pub filename: String,
    pub duration: String,
    pub timestamp: DateTime<Utc>,
    pub status: RecordingStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecordingStatus {
    Local,
    Uploaded,
    Failed,
}

#[derive(Debug, Clone)]
pub enum RecordingState {
    Idle,
    Recording { start_time: DateTime<Utc> },
    Paused { start_time: DateTime<Utc>, elapsed: u64 },
}

#[derive(Debug)]
pub struct AppState {
    pub recording_state: Arc<Mutex<RecordingState>>,
    pub recordings: Arc<Mutex<Vec<Recording>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            recording_state: Arc::new(Mutex::new(RecordingState::Idle)),
            recordings: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

#[tauri::command]
async fn start_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    
    match *recording_state {
        RecordingState::Idle => {
            *recording_state = RecordingState::Recording {
                start_time: Utc::now(),
            };
            
            // TODO: Start actual audio recording here
            // This would integrate with system audio APIs
            println!("Started recording at {}", Utc::now());
            
            Ok(())
        }
        _ => Err("Already recording or paused".to_string()),
    }
}

#[tauri::command]
async fn pause_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    
    match *recording_state {
        RecordingState::Recording { start_time } => {
            let elapsed = (Utc::now() - start_time).num_seconds() as u64;
            *recording_state = RecordingState::Paused { start_time, elapsed };
            
            // TODO: Pause actual audio recording
            println!("Paused recording after {} seconds", elapsed);
            
            Ok(())
        }
        _ => Err("Not currently recording".to_string()),
    }
}

#[tauri::command]
async fn resume_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    
    match *recording_state {
        RecordingState::Paused { start_time, elapsed: _ } => {
            *recording_state = RecordingState::Recording { start_time };
            
            // TODO: Resume actual audio recording
            println!("Resumed recording");
            
            Ok(())
        }
        _ => Err("Not currently paused".to_string()),
    }
}

#[tauri::command]
async fn stop_recording(state: State<'_, AppState>) -> Result<Recording, String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    let mut recordings = state.recordings.lock().unwrap();
    
    let (start_time, total_elapsed) = match *recording_state {
        RecordingState::Recording { start_time } => {
            let elapsed = (Utc::now() - start_time).num_seconds() as u64;
            (start_time, elapsed)
        }
        RecordingState::Paused { start_time, elapsed } => {
            (start_time, elapsed)
        }
        RecordingState::Idle => return Err("Not currently recording".to_string()),
    };
    
    // Reset state to idle
    *recording_state = RecordingState::Idle;
    
    // Create recording record
    let recording = Recording {
        id: uuid::Uuid::new_v4().to_string(),
        filename: format!("recording-{}.wav", start_time.format("%Y%m%d-%H%M%S")),
        duration: format_duration(total_elapsed),
        timestamp: start_time,
        status: RecordingStatus::Local,
    };
    
    // Add to recordings list
    recordings.insert(0, recording.clone());
    
    // Keep only the most recent 10 recordings in memory
    if recordings.len() > 10 {
        recordings.truncate(10);
    }
    
    // TODO: Stop actual audio recording and save file
    // TODO: Process the audio file for transcription
    println!("Stopped recording: {} ({})", recording.filename, recording.duration);
    
    Ok(recording)
}

#[tauri::command]
async fn get_recent_recordings(state: State<'_, AppState>) -> Result<Vec<Recording>, String> {
    let recordings = state.recordings.lock().unwrap();
    Ok(recordings.clone())
}



#[tauri::command]
async fn get_recording_state(state: State<'_, AppState>) -> Result<String, String> {
    let recording_state = state.recording_state.lock().unwrap();
    match *recording_state {
        RecordingState::Idle => Ok("idle".to_string()),
        RecordingState::Recording { .. } => Ok("recording".to_string()),
        RecordingState::Paused { .. } => Ok("paused".to_string()),
    }
}

#[tauri::command]
async fn toggle_recording(state: State<'_, AppState>) -> Result<String, String> {
    let current_state = {
        let recording_state = state.recording_state.lock().unwrap();
        match *recording_state {
            RecordingState::Idle => "idle".to_string(),
            RecordingState::Recording { .. } => "recording".to_string(),
            RecordingState::Paused { .. } => "paused".to_string(),
        }
    };
    
    match current_state.as_str() {
        "idle" => {
            start_recording(state).await?;
            Ok("Started recording".to_string())
        }
        "recording" | "paused" => {
            stop_recording(state).await?;
            Ok("Stopped recording".to_string())
        }
        _ => Err("Unknown state".to_string())
    }
}

fn format_duration(seconds: u64) -> String {
    let mins = seconds / 60;
    let secs = seconds % 60;
    format!("{:02}:{:02}", mins, secs)
}

// System tray setup
fn setup_system_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButtonState};
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
    use tauri::image::Image;
    
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
    let icon_bytes = include_bytes!("../icons/32x32.png");
    let icon = Image::from_bytes(icon_bytes)?;
    
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)  // Show menu on left click
        .tooltip("Content Recorder")
        .on_menu_event({
            let app_handle = app.clone();
            move |app, event| {
                match event.id().as_ref() {
                    "open_window" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "start_stop_recording" => {
                        let app_handle = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(state) = app_handle.try_state::<AppState>() {
                                match toggle_recording(state).await {
                                    Ok(message) => println!("{}", message),
                                    Err(e) => println!("Recording error: {}", e),
                                }
                            }
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                }
            }
        })
        .on_tray_icon_event(|_tray, event| {
            match event {
                TrayIconEvent::Click { button_state, .. } => {
                    // Menu will show on both left and right clicks due to show_menu_on_left_click(true)
                    // Right click shows menu by default, left click now also shows menu
                    if matches!(button_state, MouseButtonState::Up) {
                        // Menu will be shown automatically, no need to handle window opening here
                    }
                }
                _ => {}
            }
        })
        .build(app)?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize app state
            app.manage(AppState::default());
            
            // Setup system tray
            setup_system_tray(&app.handle()).map_err(|e| {
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
                
                // Hide main window initially (it will show when tray is clicked)
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
            toggle_recording
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}