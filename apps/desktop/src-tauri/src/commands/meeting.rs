use tauri::State;
use crate::{AppState, meeting_detector::MeetingState};
use crate::services;

#[tauri::command]
pub async fn start_meeting_detection(state: State<'_, AppState>) -> Result<(), String> {
    services::start_meeting_detection(state).await
}

#[tauri::command]
pub async fn stop_meeting_detection(state: State<'_, AppState>) -> Result<(), String> {
    services::stop_meeting_detection(state).await
}

#[tauri::command]
pub async fn get_meeting_state(state: State<'_, AppState>) -> Result<MeetingState, String> {
    services::get_meeting_state(state).await
}