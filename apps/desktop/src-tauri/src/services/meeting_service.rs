use tauri::State;
use crate::{AppState, meeting_detector::MeetingState};

pub async fn start_meeting_detection(state: State<'_, AppState>) -> Result<(), String> {
    state.meeting_detector.start_monitoring()?;
    Ok(())
}

pub async fn stop_meeting_detection(state: State<'_, AppState>) -> Result<(), String> {
    state.meeting_detector.stop_monitoring();
    Ok(())
}

pub async fn get_meeting_state(state: State<'_, AppState>) -> Result<MeetingState, String> {
    Ok(state.meeting_detector.get_state())
}