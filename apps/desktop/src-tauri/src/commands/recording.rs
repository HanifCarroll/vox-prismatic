use tauri::{State, AppHandle};
use crate::{AppState, Recording};
use crate::services;

#[tauri::command]
pub async fn start_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    services::start_recording(state, app_handle).await
}

#[tauri::command]
pub async fn pause_recording(state: State<'_, AppState>) -> Result<(), String> {
    services::pause_recording(state).await
}

#[tauri::command]
pub async fn resume_recording(state: State<'_, AppState>) -> Result<(), String> {
    services::resume_recording(state).await
}

#[tauri::command]
pub async fn stop_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<Recording, String> {
    services::stop_recording(state, app_handle).await
}

#[tauri::command]
pub async fn get_recent_recordings(state: State<'_, AppState>) -> Result<Vec<Recording>, String> {
    services::get_recent_recordings(state).await
}

#[tauri::command]
pub async fn get_recording_state(state: State<'_, AppState>) -> Result<String, String> {
    services::get_recording_state(state).await
}

#[tauri::command]
pub async fn toggle_recording(state: State<'_, AppState>, app_handle: AppHandle) -> Result<String, String> {
    services::toggle_recording(state, app_handle).await
}