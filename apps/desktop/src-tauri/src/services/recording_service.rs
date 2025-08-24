use chrono::Utc;
use tauri::{State, AppHandle};
use uuid::Uuid;
use crate::{AppState, Recording, RecordingState, RecordingStatus, AudioCommand};

pub async fn start_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    let start_time = Utc::now();
    let file_name = format!("recording_{}.wav", start_time.format("%Y%m%d_%H%M%S"));
    let file_path = std::env::temp_dir().join(&file_name);

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
        }
    }

    let end_time = Utc::now();
    let duration_seconds = (end_time - start_time).num_seconds();
    let duration = format!("{}:{:02}", duration_seconds / 60, duration_seconds % 60);

    let recording = Recording {
        id: Uuid::new_v4().to_string(),
        filename: file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("recording.wav")
            .to_string(),
        duration,
        timestamp: end_time,
        status: RecordingStatus::Local,
    };

    // Add to recordings list
    {
        let mut recordings = state.recordings.lock().unwrap();
        recordings.insert(0, recording.clone());
        if recordings.len() > 10 {
            recordings.truncate(10);
        }
    }

    // Update tray menu
    let _ = crate::tray::update_tray_menu(&app_handle, false);

    Ok(recording)
}

pub async fn get_recent_recordings(state: State<'_, AppState>) -> Result<Vec<Recording>, String> {
    let recordings = state.recordings.lock().unwrap();
    Ok(recordings.clone())
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