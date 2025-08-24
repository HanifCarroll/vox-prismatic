use tauri::{State, AppHandle};
use crate::AppState;
use crate::services::{TranscriptionService, get_recording_path};
use crate::events::EventEmitter;

#[tauri::command]
pub async fn transcribe_recording_stream(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    recording_id: String,
    api_url: String,
    api_key: Option<String>
) -> Result<String, String> {
    println!("Starting streaming transcription for recording: {}", recording_id);
    
    // Find the recording
    let recording = {
        let recordings = state.recordings.lock().unwrap();
        recordings.iter()
            .find(|r| r.id == recording_id)
            .cloned()
            .ok_or_else(|| "Recording not found".to_string())?
    };
    
    // Get the full path to the audio file
    let file_path = get_recording_path(&app_handle, &recording.filename)?;
    
    // Check if file exists
    if !file_path.exists() {
        return Err("Audio file not found".to_string());
    }
    
    // Emit status update to frontend
    EventEmitter::transcription_started(&app_handle, &recording_id);
    
    // Perform streaming transcription
    let api_key_ref = api_key.as_deref();
    let transcription_result = TranscriptionService::transcribe_audio_stream(
        &file_path,
        &api_url,
        api_key_ref
    ).await;
    
    match transcription_result {
        Ok(response) => {
            // Emit success to frontend with transcription response
            EventEmitter::transcription_success(&app_handle, &recording_id, &response);
            
            println!("Streaming transcription completed for recording: {}", recording_id);
            Ok("Transcription completed successfully".to_string())
        }
        Err(e) => {
            // Emit error to frontend
            EventEmitter::transcription_failed(&app_handle, &recording_id, &e);
            
            eprintln!("Streaming transcription failed for recording {}: {}", recording_id, e);
            Err(e)
        }
    }
}