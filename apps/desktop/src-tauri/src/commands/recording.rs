use tauri::{State, AppHandle};
use crate::{AppState, Recording};
use crate::services;

#[tauri::command]
pub async fn start_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    services::start_recording(state, app_handle).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pause_recording(state: State<'_, AppState>) -> Result<(), String> {
    services::pause_recording(state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resume_recording(state: State<'_, AppState>) -> Result<(), String> {
    services::resume_recording(state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<Recording, String> {
    services::stop_recording(state, app_handle).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recent_recordings(state: State<'_, AppState>) -> Result<Vec<Recording>, String> {
    services::get_recent_recordings(state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recording_state(state: State<'_, AppState>) -> Result<String, String> {
    services::get_recording_state(state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<String, String> {
    services::toggle_recording(state, app_handle).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn play_recording(state: State<'_, AppState>, app_handle: AppHandle, recording_id: String) -> Result<(), String> {
    services::play_recording(state, app_handle, recording_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_playback(state: State<'_, AppState>) -> Result<(), String> {
    services::stop_playback(state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_playback_state(state: State<'_, AppState>) -> Result<String, String> {
    services::get_playback_state(state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_recording(state: State<'_, AppState>, app_handle: AppHandle, recording_id: String) -> Result<(), String> {
    services::delete_recording(state, app_handle, recording_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_recordings_from_disk(state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    services::load_recordings_from_disk(state, app_handle).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_recordings_folder(app_handle: AppHandle) -> Result<(), String> {
    services::open_recordings_folder(app_handle).await.map_err(|e| e.to_string())
}