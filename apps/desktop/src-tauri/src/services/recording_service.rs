use chrono::Utc;
use tauri::{Manager, State, AppHandle, Emitter};
use uuid::Uuid;
use std::path::PathBuf;
use serde_json;
use crate::{AppState, Recording, RecordingState, RecordingStatus, AudioCommand, PlaybackState};
use super::audio_converter::AudioConverter;
use super::transcription_service::TranscriptionService;
use crate::app_config::AppConfig;

// Helper function to get the app's recordings directory
pub fn get_recordings_directory(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let recordings_dir = app_data_dir.join("recordings");
    std::fs::create_dir_all(&recordings_dir)
        .map_err(|e| format!("Failed to create recordings directory: {}", e))?;
    
    Ok(recordings_dir)
}

// Helper function to get the full path to a recording file
pub fn get_recording_path(app_handle: &AppHandle, filename: &str) -> Result<PathBuf, String> {
    let recordings_dir = get_recordings_directory(app_handle)?;
    Ok(recordings_dir.join(filename))
}

// Helper function to get the recordings metadata file path
fn get_metadata_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let recordings_dir = get_recordings_directory(app_handle)?;
    Ok(recordings_dir.join("recordings.json"))
}

// Save recordings metadata to disk
pub fn save_recordings_metadata(app_handle: &AppHandle, recordings: &[Recording]) -> Result<(), String> {
    let metadata_path = get_metadata_path(app_handle)?;
    let json_data = serde_json::to_string_pretty(recordings)
        .map_err(|e| format!("Failed to serialize recordings: {}", e))?;
    
    println!("Saving {} recordings to: {}", recordings.len(), metadata_path.display());
    for recording in recordings {
        println!("Saving recording: {} ({})", recording.filename, recording.timestamp);
    }
    
    std::fs::write(&metadata_path, json_data)
        .map_err(|e| format!("Failed to write metadata file: {}", e))?;
    
    println!("Successfully saved recordings metadata");
    Ok(())
}

// Load recordings metadata from disk
pub fn load_recordings_metadata(app_handle: &AppHandle) -> Result<Vec<Recording>, String> {
    let metadata_path = get_metadata_path(app_handle)?;
    
    println!("Loading recordings metadata from: {}", metadata_path.display());
    
    // If metadata file doesn't exist, return empty vec
    if !metadata_path.exists() {
        println!("Metadata file does not exist, returning empty list");
        return Ok(Vec::new());
    }
    
    let json_data = std::fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata file: {}", e))?;
    
    let recordings: Vec<Recording> = serde_json::from_str(&json_data)
        .map_err(|e| format!("Failed to deserialize recordings: {}", e))?;
    
    // Filter out recordings where the actual file no longer exists
    let mut valid_recordings = Vec::new();
    for recording in recordings {
        let file_path = get_recording_path(app_handle, &recording.filename)?;
        if file_path.exists() {
            valid_recordings.push(recording);
        }
    }
    
    // Sort by timestamp (most recent first) and limit to 5
    valid_recordings.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    if valid_recordings.len() > 5 {
        valid_recordings.truncate(5);
    }
    
    Ok(valid_recordings)
}

pub async fn start_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    let start_time = Utc::now();
    let file_name = format!("recording_{}.wav", start_time.format("%Y%m%d_%H%M%S"));
    
    // Get app-specific recordings directory
    let recordings_dir = get_recordings_directory(&app_handle)?;
    let file_path = recordings_dir.join(&file_name);

    // Update recording state
    {
        let mut recording_state = state.recording_state.lock().unwrap();
        *recording_state = RecordingState::Recording { 
            start_time,
            file_path: file_path.clone(),
        };
    }

    // Start audio recording
    {
        let mut audio_recorder = state.audio_recorder.lock().unwrap();
        
        // Initialize audio system if not already done
        if audio_recorder.command_sender.is_none() {
            audio_recorder.initialize().map_err(|e| format!("Failed to initialize audio system: {}", e))?;
        }
        
        if let Some(ref sender) = audio_recorder.command_sender {
            sender.send(AudioCommand::StartRecording { 
                file_path: file_path.clone() 
            }).map_err(|e| format!("Failed to send start command: {}", e))?;
            audio_recorder.current_file_path = Some(file_path);
            audio_recorder.is_recording = true;
        } else {
            return Err("Audio system initialization failed".to_string());
        }
    }

    // Update tray menu
    let _ = crate::tray::update_tray_menu(&app_handle, true);

    Ok(())
}

pub async fn pause_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    match *recording_state {
        RecordingState::Recording { start_time, ref file_path } => {
            let elapsed = (Utc::now() - start_time).num_seconds() as u64;
            let file_path_clone = file_path.clone();
            *recording_state = RecordingState::Paused { 
                start_time, 
                elapsed, 
                file_path: file_path_clone,
            };
            Ok(())
        }
        _ => Err("Not currently recording".to_string()),
    }
}

pub async fn resume_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut recording_state = state.recording_state.lock().unwrap();
    match *recording_state {
        RecordingState::Paused { start_time, ref file_path, .. } => {
            let file_path_clone = file_path.clone();
            *recording_state = RecordingState::Recording { 
                start_time, 
                file_path: file_path_clone,
            };
            Ok(())
        }
        _ => Err("Recording is not paused".to_string()),
    }
}

pub async fn stop_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<Recording, String> {
    let (start_time, file_path) = {
        let mut recording_state = state.recording_state.lock().unwrap();
        
        match *recording_state {
            RecordingState::Recording { start_time, ref file_path } |
            RecordingState::Paused { start_time, ref file_path, .. } => {
                let file_path_clone = file_path.clone();
                *recording_state = RecordingState::Idle;
                (start_time, file_path_clone)
            }
            _ => return Err("Not recording".to_string()),
        }
    };

    // Stop audio recording
    {
        let mut audio_recorder = state.audio_recorder.lock().unwrap();
        if let Some(ref sender) = audio_recorder.command_sender {
            sender.send(AudioCommand::StopRecording).map_err(|e| format!("Failed to send stop command: {}", e))?;
            audio_recorder.is_recording = false;
            audio_recorder.current_file_path = None;
            
            // Clean up the recorder state to force reinitialization for next use
            audio_recorder.command_sender = None;
            audio_recorder.audio_thread = None;
        }
    }

    let end_time = Utc::now();
    let duration_seconds = (end_time - start_time).num_seconds();
    let duration = format!("{}:{:02}", duration_seconds / 60, duration_seconds % 60);

    // Wait for WAV file to be fully written and finalized
    println!("Waiting for WAV file to be finalized...");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // Validate WAV file before conversion
    let mut attempts = 0;
    while attempts < 5 {
        if let Ok(metadata) = std::fs::metadata(&file_path) {
            if metadata.len() > 44 { // WAV header is 44 bytes minimum
                break;
            }
        }
        println!("WAV file not ready, waiting... (attempt {})", attempts + 1);
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        attempts += 1;
    }

    // Convert WAV to Opus for optimal storage and universal playability
    let final_file_path = match AudioConverter::convert_wav_to_opus(&file_path, &app_handle).await {
        Ok(opus_path) => {
            // Log conversion statistics and use Opus as the primary file
            if let Ok(info) = AudioConverter::get_conversion_info(&file_path, &opus_path) {
                println!("Audio conversion successful: {}", info);
            } else {
                println!("Audio conversion successful: {}", opus_path.display());
            }
            opus_path
        }
        Err(e) => {
            eprintln!("Failed to convert audio to Opus: {}, keeping WAV file", e);
            // Keep the original WAV file if conversion fails
            file_path
        }
    };

    let recording = Recording {
        id: Uuid::new_v4().to_string(),
        filename: final_file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("recording.opus")
            .to_string(),
        duration,
        timestamp: end_time,
        status: RecordingStatus::Local,
    };

    // Add to recordings list and save metadata
    {
        let mut recordings = state.recordings.lock().unwrap();
        recordings.insert(0, recording.clone());
        if recordings.len() > 5 {
            recordings.truncate(5);
        }
        
        // Save recordings metadata to disk
        if let Err(e) = save_recordings_metadata(&app_handle, &recordings) {
            eprintln!("Failed to save recordings metadata: {}", e);
        }
    }

    // Automatically start transcription if Opus conversion was successful
    if final_file_path.extension().and_then(|ext| ext.to_str()) == Some("opus") {
        let recording_id = recording.id.clone();
        let app_handle_clone = app_handle.clone();
        
        // Spawn async task for auto-transcription
        tauri::async_runtime::spawn(async move {
            // Load config to get web app URL
            let config = match AppConfig::load(&app_handle_clone).await {
                Ok(config) => config,
                Err(e) => {
                    eprintln!("Failed to load config for auto-transcription: {}", e);
                    let _ = app_handle_clone.emit("transcription_failed", (&recording_id, &format!("Config error: {}", e)));
                    return;
                }
            };
            
            let api_url = config.transcribe_endpoint();
            let api_key = config.api_key.as_deref();
            
            println!("Auto-starting transcription for recording: {} -> {}", recording_id, api_url);
            
            // Emit transcription started event
            let _ = app_handle_clone.emit("transcription_started", &recording_id);
            
            match TranscriptionService::transcribe_audio_stream(
                &final_file_path,
                &api_url,
                api_key
            ).await {
                Ok(response) => {
                    println!("Auto-transcription completed for {}: {} words", 
                            recording_id, response.word_count.unwrap_or(0));
                    let _ = app_handle_clone.emit("transcription_success", (&recording_id, &response));
                }
                Err(e) => {
                    eprintln!("Auto-transcription failed for {}: {}", recording_id, e);
                    let _ = app_handle_clone.emit("transcription_failed", (&recording_id, &e));
                }
            }
        });
    }

    // Update tray menu
    let _ = crate::tray::update_tray_menu(&app_handle, false);

    Ok(recording)
}

pub async fn get_recent_recordings(state: State<'_, AppState>) -> Result<Vec<Recording>, String> {
    let recordings = state.recordings.lock().unwrap();
    Ok(recordings.clone())
}

// Load recordings from persistent storage and populate the state
pub async fn load_recordings_from_disk(state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    let recordings = load_recordings_metadata(&app_handle)?;
    
    println!("Loading {} recordings from disk", recordings.len());
    for recording in &recordings {
        println!("Loaded recording: {} ({})", recording.filename, recording.timestamp);
    }
    
    {
        let mut state_recordings = state.recordings.lock().unwrap();
        *state_recordings = recordings;
    }
    
    Ok(())
}

pub async fn get_recording_state(state: State<'_, AppState>) -> Result<String, String> {
    let recording_state = state.recording_state.lock().unwrap();
    let state_str = match *recording_state {
        RecordingState::Idle => "idle",
        RecordingState::Recording { .. } => "recording", 
        RecordingState::Paused { .. } => "paused",
    };
    Ok(state_str.to_string())
}

pub async fn toggle_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<String, String> {
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
            stop_recording(state, app_handle).await?;
            Ok("Stopped recording".to_string())
        }
        _ => Err("Unknown state".to_string())
    }
}

// Playback functions
pub async fn play_recording(state: State<'_, AppState>, app_handle: AppHandle, recording_id: String) -> Result<(), String> {
    // Find the recording by ID
    let recording = {
        let recordings = state.recordings.lock().unwrap();
        recordings.iter()
            .find(|r| r.id == recording_id)
            .cloned()
            .ok_or_else(|| "Recording not found".to_string())?
    };
    
    // Get the full path to the recording file
    let file_path = get_recording_path(&app_handle, &recording.filename)?;
    
    // Check if file exists
    if !file_path.exists() {
        return Err("Recording file not found".to_string());
    }
    
    // Update playback state
    {
        let mut playback_state = state.playback_state.lock().unwrap();
        *playback_state = PlaybackState::Playing {
            recording_id: recording.id.clone(),
            filename: recording.filename.clone(),
            start_time: Utc::now(),
        };
    }
    
    // Send playback command to audio system
    {
        let mut audio_recorder = state.audio_recorder.lock().unwrap();
        
        // Initialize audio system if not already done
        if audio_recorder.command_sender.is_none() {
            audio_recorder.initialize().map_err(|e| format!("Failed to initialize audio system: {}", e))?;
        }
        
        if let Some(ref sender) = audio_recorder.command_sender {
            sender.send(AudioCommand::StartPlayback { 
                file_path: file_path.clone(),
                app_handle: app_handle.clone()
            }).map_err(|e| format!("Failed to send playback command: {}", e))?;
        } else {
            return Err("Audio system initialization failed".to_string());
        }
    }
    
    println!("Started playback of recording: {}", recording.filename);
    Ok(())
}

pub async fn stop_playback(state: State<'_, AppState>) -> Result<(), String> {
    // Update playback state
    {
        let mut playback_state = state.playback_state.lock().unwrap();
        *playback_state = PlaybackState::Idle;
    }
    
    // Send stop playback command to audio system
    {
        let audio_recorder = state.audio_recorder.lock().unwrap();
        if let Some(ref sender) = audio_recorder.command_sender {
            sender.send(AudioCommand::StopPlayback)
                .map_err(|e| format!("Failed to send stop playback command: {}", e))?;
        }
    }
    
    println!("Stopped audio playback");
    Ok(())
}

pub async fn get_playback_state(state: State<'_, AppState>) -> Result<String, String> {
    let playback_state = state.playback_state.lock().unwrap();
    let state_str = match *playback_state {
        PlaybackState::Idle => "idle",
        PlaybackState::Playing { .. } => "playing",
    };
    Ok(state_str.to_string())
}

// Deletion function
pub async fn delete_recording(state: State<'_, AppState>, app_handle: AppHandle, recording_id: String) -> Result<(), String> {
    // Find the recording by ID
    let recording = {
        let recordings = state.recordings.lock().unwrap();
        recordings.iter()
            .find(|r| r.id == recording_id)
            .cloned()
            .ok_or_else(|| "Recording not found".to_string())?
    };
    
    // Get the full path to the recording file
    let file_path = get_recording_path(&app_handle, &recording.filename)?;
    
    // Delete the file if it exists
    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete recording file: {}", e))?;
    }
    
    // Remove from recordings list and save metadata
    {
        let mut recordings = state.recordings.lock().unwrap();
        recordings.retain(|r| r.id != recording_id);
        
        // Save updated recordings metadata to disk
        if let Err(e) = save_recordings_metadata(&app_handle, &recordings) {
            eprintln!("Failed to save recordings metadata: {}", e);
        }
    }
    
    // Stop playback if this recording is currently playing
    let should_stop_playback = {
        let playback_state = state.playback_state.lock().unwrap();
        if let PlaybackState::Playing { recording_id: playing_id, .. } = &*playback_state {
            playing_id == &recording_id
        } else {
            false
        }
    };
    
    if should_stop_playback {
        stop_playback(state).await?;
    }
    
    println!("Deleted recording: {}", recording.filename);
    Ok(())
}

// Open the recordings directory in the file explorer
pub async fn open_recordings_folder(app_handle: AppHandle) -> Result<(), String> {
    let recordings_dir = get_recordings_directory(&app_handle)?;
    
    // Use the opener plugin to open the directory
    tauri::async_runtime::spawn(async move {
        if let Err(e) = tauri_plugin_opener::open_path(recordings_dir, None::<String>) {
            eprintln!("Failed to open recordings folder: {}", e);
        }
    });
    
    Ok(())
}