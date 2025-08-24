use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Manager, Emitter};
use chrono::{DateTime, Utc};
use crossbeam_channel::{Receiver, Sender, unbounded};
use std::path::PathBuf;
use std::thread::{self, JoinHandle};

// Audio recording imports
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, StreamConfig};
use hound::{WavSpec, WavWriter, SampleFormat};

// Modules
mod meeting_detector;
mod commands;
mod services;
mod tray;

// Re-exports
use meeting_detector::MeetingDetector;
pub use commands::*;

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

#[derive(Debug, Clone)]
pub enum PlaybackState {
    Idle,
    Playing { 
        recording_id: String,
        filename: String,
        start_time: DateTime<Utc>,
    },
}

// Commands for audio thread management
#[derive(Debug)]
enum AudioCommand {
    StartRecording { file_path: PathBuf },
    StopRecording,
    StartPlayback { file_path: PathBuf, app_handle: tauri::AppHandle },
    StopPlayback,
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

    pub fn initialize(&mut self) -> Result<(), String> {
        if self.command_sender.is_some() {
            return Ok(()); // Already initialized
        }

        // Create command channel for audio thread
        let (command_sender, command_receiver) = unbounded::<AudioCommand>();
        
        // Start audio manager thread
        let audio_thread = thread::spawn(move || {
            audio_manager_thread(command_receiver);
        });
        
        self.command_sender = Some(command_sender);
        self.audio_thread = Some(audio_thread);
        
        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        self.is_recording
    }
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub recording_state: Arc<Mutex<RecordingState>>,
    pub playback_state: Arc<Mutex<PlaybackState>>,
    pub recordings: Arc<Mutex<Vec<Recording>>>,
    pub audio_recorder: Arc<Mutex<RecorderState>>,
    pub meeting_detector: Arc<MeetingDetector>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            recording_state: Arc::new(Mutex::new(RecordingState::Idle)),
            playback_state: Arc::new(Mutex::new(PlaybackState::Idle)),
            recordings: Arc::new(Mutex::new(Vec::new())),
            audio_recorder: Arc::new(Mutex::new(RecorderState::new())),
            meeting_detector: Arc::new(MeetingDetector::new()),
        }
    }
}

impl AppState {
    pub fn initialize_audio_system(&self) -> Result<(), String> {
        let mut audio_recorder = self.audio_recorder.lock().unwrap();
        audio_recorder.initialize()
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
                    // Give writer thread time to finalize the WAV file
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                println!("Stopped audio recording");
                // Don't exit the thread, keep it alive for future operations
            }
            AudioCommand::StartPlayback { file_path, app_handle } => {
                // Stop any existing stream
                if let Some(stream) = current_stream.take() {
                    drop(stream);
                }
                if let Some(sender) = current_writer_sender.take() {
                    drop(sender);
                }
                
                // Start playback
                match start_audio_playback(&file_path, app_handle) {
                    Ok(stream) => {
                        current_stream = Some(stream);
                    }
                    Err(e) => {
                        eprintln!("Failed to start playback: {}", e);
                    }
                }
            }
            AudioCommand::StopPlayback => {
                // Stop playback by dropping the stream
                if let Some(stream) = current_stream.take() {
                    drop(stream);
                }
                if let Some(sender) = current_writer_sender.take() {
                    drop(sender);
                }
            }
        }
    }
}

// Helper function to start audio recording (returns the stream and writer sender)
fn start_audio_recording(file_path: &PathBuf) -> Result<(cpal::Stream, Sender<f32>), String> {
    // Get audio device and config first to match sample rate
    let (device, config) = get_audio_device_and_config()?;
    println!("Using audio device sample rate: {} Hz, channels: {}", config.sample_rate.0, config.channels);
    
    // Setup WAV writer specification matching device config
    let spec = WavSpec {
        channels: config.channels as u16,
        sample_rate: config.sample_rate.0,
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

    // Device and config already obtained above
    
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

// Helper function to start audio playback (returns the playbook stream)
fn start_audio_playback(file_path: &PathBuf, app_handle: tauri::AppHandle) -> Result<cpal::Stream, String> {
    // Get audio device and config for output
    let host = cpal::default_host();
    let device = host.default_output_device()
        .ok_or_else(|| "No output device available".to_string())?;
    
    // Read the WAV file to get its configuration
    let mut reader = hound::WavReader::open(file_path)
        .map_err(|e| format!("Failed to open WAV file: {}", e))?;
    
    let wav_spec = reader.spec();
    
    // Create output config matching the WAV file
    let config = cpal::StreamConfig {
        channels: wav_spec.channels,
        sample_rate: cpal::SampleRate(wav_spec.sample_rate),
        buffer_size: cpal::BufferSize::Default,
    };
    
    // Read all samples from WAV file
    let samples: Vec<f32> = reader.samples::<i16>()
        .map(|s| s.unwrap_or(0) as f32 / i16::MAX as f32)
        .collect();
    
    let samples = Arc::new(samples);
    let sample_index = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let playback_finished = Arc::new(std::sync::atomic::AtomicBool::new(false));
    
    // Create output stream
    let samples_clone = samples.clone();
    let sample_index_clone = sample_index.clone();
    let playback_finished_clone = playback_finished.clone();
    let app_handle_clone = app_handle.clone();
    
    let stream = device.build_output_stream(
        &config,
        move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
            for frame in data.iter_mut() {
                let index = sample_index_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                if index < samples_clone.len() {
                    *frame = samples_clone[index];
                } else {
                    *frame = 0.0; // Silence when playbook is done
                    
                    // Check if this is the first time we've finished
                    if !playback_finished_clone.load(std::sync::atomic::Ordering::Relaxed) {
                        playback_finished_clone.store(true, std::sync::atomic::Ordering::Relaxed);
                        // Emit event to frontend that playback finished
                        let _ = app_handle_clone.emit("playback-finished", ());
                    }
                }
            }
        },
        |err| {
            eprintln!("Audio playback error: {}", err);
        },
        None,
    ).map_err(|e| format!("Failed to build playback stream: {}", e))?;
    
    // Start playback
    stream.play().map_err(|e| format!("Failed to start playback: {}", e))?;
    
    Ok(stream)
}



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
                                let _ = app_handle_clone.emit("meeting-detected", &meeting_state);
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
                        
                        let _ = app_handle_clone.emit("meeting-ended", ());
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
                
                // Handle dock icon click - use a different approach
                // For now, we'll rely on the tray menu to show the window
                // TODO: Implement proper dock icon handling when Tauri v2 API is more stable
                
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
            transcribe_recording_stream
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