use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use chrono::{DateTime, Utc};
use crossbeam_channel::{Receiver, Sender, unbounded};
use std::path::PathBuf;
use std::thread::{self, JoinHandle};

// Audio recording imports
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, StreamConfig};
use hound::{WavSpec, WavWriter, SampleFormat};

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
    Recording { 
        start_time: DateTime<Utc>,
        #[allow(dead_code)]
        file_path: PathBuf,
    },
    Paused { 
        start_time: DateTime<Utc>, 
        elapsed: u64,
        #[allow(dead_code)]
        file_path: PathBuf,
    },
}

// Commands for audio thread management
#[derive(Debug)]
enum AudioCommand {
    StartRecording { file_path: PathBuf },
    StopRecording,
}

// Audio recorder state - only stores thread-safe data
#[derive(Debug)]
pub struct RecorderState {
    // Channel to send commands to the audio manager thread
    command_sender: Option<Sender<AudioCommand>>,
    // Handle to the audio manager thread
    audio_thread: Option<JoinHandle<()>>,
    // Current recording file path
    current_file_path: Option<PathBuf>,
    // Recording status
    is_recording: bool,
}

impl RecorderState {
    pub fn new() -> Self {
        Self {
            command_sender: None,
            audio_thread: None,
            current_file_path: None,
            is_recording: false,
        }
    }

    pub fn is_recording(&self) -> bool {
        self.is_recording
    }
}

#[derive(Debug)]
pub struct AppState {
    pub recording_state: Arc<Mutex<RecordingState>>,
    pub recordings: Arc<Mutex<Vec<Recording>>>,
    pub audio_recorder: Arc<Mutex<RecorderState>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            recording_state: Arc::new(Mutex::new(RecordingState::Idle)),
            recordings: Arc::new(Mutex::new(Vec::new())),
            audio_recorder: Arc::new(Mutex::new(RecorderState::new())),
        }
    }
}

// Helper function to get audio device and config
fn get_audio_device_and_config() -> Result<(Device, StreamConfig), String> {
    let host = cpal::default_host();
    
    // Try to get default input device (microphone)
    let device = host.default_input_device()
        .ok_or_else(|| "No input device available".to_string())?;
    
    // Get the default input configuration
    let config = device.default_input_config()
        .map_err(|e| format!("Failed to get default input config: {}", e))?;
    
    Ok((device, config.into()))
}

// Audio manager that runs in a separate thread and handles the cpal stream
fn audio_manager_thread(command_receiver: Receiver<AudioCommand>) {
    let mut current_stream: Option<cpal::Stream> = None;
    let mut current_writer_sender: Option<Sender<f32>> = None;
    
    while let Ok(command) = command_receiver.recv() {
        match command {
            AudioCommand::StartRecording { file_path } => {
                // Stop any existing recording
                if let Some(stream) = current_stream.take() {
                    drop(stream);
                }
                if let Some(sender) = current_writer_sender.take() {
                    drop(sender);
                }
                
                // Start new recording
                match start_audio_recording(&file_path) {
                    Ok((stream, writer_sender)) => {
                        current_stream = Some(stream);
                        current_writer_sender = Some(writer_sender);
                        println!("Started recording to: {}", file_path.display());
                    }
                    Err(e) => {
                        eprintln!("Failed to start recording: {}", e);
                    }
                }
            }
            AudioCommand::StopRecording => {
                // Stop recording by dropping the stream and sender
                if let Some(stream) = current_stream.take() {
                    drop(stream);
                }
                if let Some(sender) = current_writer_sender.take() {
                    drop(sender);
                }
                println!("Stopped audio recording");
                break; // Exit the thread
            }
        }
    }
}

// Helper function to start audio recording (returns the stream and writer sender)
fn start_audio_recording(file_path: &PathBuf) -> Result<(cpal::Stream, Sender<f32>), String> {
    // Setup WAV writer specification
    let spec = WavSpec {
        channels: 1,
        sample_rate: 44100,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    // Create WAV writer
    let writer = WavWriter::create(&file_path, spec)
        .map_err(|e| format!("Failed to create WAV writer: {}", e))?;
    let writer = Arc::new(Mutex::new(Some(writer)));

    // Create channel for audio data
    let (sender, receiver) = unbounded::<f32>();

    // Spawn writer thread
    let writer_clone = writer.clone();
    thread::spawn(move || {
        while let Ok(sample) = receiver.recv() {
            // Convert f32 sample to i16 for WAV file
            let amplitude = i16::MAX as f32;
            let sample_i16 = (sample.clamp(-1.0, 1.0) * amplitude) as i16;
            
            if let Some(writer) = writer_clone.lock().unwrap().as_mut() {
                if let Err(e) = writer.write_sample(sample_i16) {
                    eprintln!("Failed to write audio sample: {}", e);
                    break;
                }
            }
        }
        
        // Finalize the file when channel closes
        if let Some(writer) = writer_clone.lock().unwrap().take() {
            if let Err(e) = writer.finalize() {
                eprintln!("Failed to finalize WAV file: {}", e);
            }
        }
    });

    // Get audio device and config
    let (device, config) = get_audio_device_and_config()?;
    
    // Create audio stream
    let sender_clone = sender.clone();
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            // Send audio data to writer thread
            for &sample in data.iter() {
                if sender_clone.send(sample).is_err() {
                    break;
                }
            }
        },
        |err| {
            eprintln!("Audio stream error: {}", err);
        },
        None,
    ).map_err(|e| format!("Failed to build audio stream: {}", e))?;

    // Start the stream
    stream.play().map_err(|e| format!("Failed to start audio stream: {}", e))?;
    
    Ok((stream, sender))
}

#[tauri::command]
async fn start_recording(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let start_time = Utc::now();
    
    // Check if already recording
    {
        let recorder = state.audio_recorder.lock().unwrap();
        if recorder.is_recording() {
            return Err("Already recording".to_string());
        }
    }

    // Create recordings directory if it doesn't exist
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create recordings directory: {}", e))?;

    // Generate unique filename
    let filename = format!("recording_{}.wav", start_time.format("%Y%m%d_%H%M%S"));
    let file_path = app_data_dir.join(&filename);

    // Initialize audio manager thread if not already running
    {
        let mut recorder = state.audio_recorder.lock().unwrap();
        
        if recorder.command_sender.is_none() {
            // Create command channel for audio thread
            let (command_sender, command_receiver) = unbounded::<AudioCommand>();
            
            // Start audio manager thread
            let audio_thread = thread::spawn(move || {
                audio_manager_thread(command_receiver);
            });
            
            recorder.command_sender = Some(command_sender);
            recorder.audio_thread = Some(audio_thread);
        }
        
        // Send start recording command
        if let Some(sender) = &recorder.command_sender {
            sender.send(AudioCommand::StartRecording { 
                file_path: file_path.clone() 
            }).map_err(|e| format!("Failed to send start command: {}", e))?;
        }
        
        recorder.current_file_path = Some(file_path.clone());
        recorder.is_recording = true;
    }

    // Update recording state
    {
        let mut recording_state = state.recording_state.lock().unwrap();
        *recording_state = RecordingState::Recording {
            start_time,
            file_path: file_path.clone(),
        };
    }

    Ok(())
}

#[tauri::command]
async fn pause_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    
    match *recording_state {
        RecordingState::Recording { start_time, ref file_path } => {
            let elapsed = (Utc::now() - start_time).num_seconds() as u64;
            *recording_state = RecordingState::Paused { 
                start_time, 
                elapsed,
                file_path: file_path.clone(),
            };
            
            // Note: We're not actually pausing the audio stream here
            // This would require more complex state management
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
        RecordingState::Paused { start_time, file_path: ref path, .. } => {
            *recording_state = RecordingState::Recording { 
                start_time,
                file_path: path.clone(),
            };
            println!("Resumed recording");
            Ok(())
        }
        _ => Err("Not currently paused".to_string()),
    }
}

#[tauri::command]
async fn stop_recording(state: State<'_, AppState>) -> Result<Recording, String> {
    let (start_time, file_path) = {
        let mut recording_state = state.recording_state.lock().unwrap();
        
        match *recording_state {
            RecordingState::Recording { start_time, ref file_path } |
            RecordingState::Paused { start_time, ref file_path, .. } => {
                let start_time = start_time;
                let file_path = file_path.clone();
                *recording_state = RecordingState::Idle;
                (start_time, file_path)
            }
            RecordingState::Idle => {
                return Err("Not currently recording".to_string());
            }
        }
    };

    // Stop the audio recording
    {
        let mut recorder = state.audio_recorder.lock().unwrap();
        
        // Send stop command to audio thread
        if let Some(sender) = &recorder.command_sender {
            sender.send(AudioCommand::StopRecording)
                .map_err(|e| format!("Failed to send stop command: {}", e))?;
        }
        
        // Wait for audio thread to finish and clean up
        if let Some(audio_thread) = recorder.audio_thread.take() {
            // Thread will exit after processing StopRecording command
            let _ = audio_thread.join();
        }
        
        recorder.command_sender.take();
        recorder.current_file_path.take();
        recorder.is_recording = false;
    }

    // Calculate duration
    let duration_secs = (Utc::now() - start_time).num_seconds() as u64;
    let duration_str = format_duration(duration_secs);
    
    // Create recording record
    let recording = Recording {
        id: uuid::Uuid::new_v4().to_string(),
        filename: file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.wav")
            .to_string(),
        duration: duration_str,
        timestamp: start_time,
        status: RecordingStatus::Local,
    };

    // Add to recordings list
    {
        let mut recordings = state.recordings.lock().unwrap();
        recordings.insert(0, recording.clone()); // Insert at beginning
        
        // Keep only last 10 recordings
        if recordings.len() > 10 {
            recordings.truncate(10);
        }
    }

    println!("Stopped recording. Duration: {} seconds", duration_secs);
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
async fn toggle_recording(state: State<'_, AppState>, app_handle: tauri::AppHandle) -> Result<String, String> {
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
            start_recording(state, app_handle).await?;
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
                                match toggle_recording(state, app_handle.clone()).await {
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