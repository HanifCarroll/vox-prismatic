use tauri::{AppHandle, Emitter};
use serde::Serialize;

/// Event names used throughout the application
pub struct Events;

impl Events {
    // Recording related events
    pub const RECORDING_STATE_CHANGED: &'static str = "recording-state-changed";
    
    // Playback related events  
    pub const PLAYBACK_FINISHED: &'static str = "playback-finished";
    
    // Transcription related events
    pub const TRANSCRIPTION_STARTED: &'static str = "transcription_started";
    pub const TRANSCRIPTION_SUCCESS: &'static str = "transcription_success";
    pub const TRANSCRIPTION_FAILED: &'static str = "transcription_failed";
    
    // Meeting detection events
    pub const MEETING_DETECTED: &'static str = "meeting-detected";
    pub const MEETING_ENDED: &'static str = "meeting-ended";
}

/// Helper functions for emitting common events
pub struct EventEmitter;

impl EventEmitter {
    /// Emit a recording state change event
    pub fn recording_state_changed(app_handle: &AppHandle) {
        let _ = app_handle.emit(Events::RECORDING_STATE_CHANGED, ());
    }
    
    /// Emit a playback finished event
    pub fn playback_finished(app_handle: &AppHandle) {
        let _ = app_handle.emit(Events::PLAYBACK_FINISHED, ());
    }
    
    /// Emit a transcription started event
    pub fn transcription_started(app_handle: &AppHandle, recording_id: &str) {
        let _ = app_handle.emit(Events::TRANSCRIPTION_STARTED, recording_id);
    }
    
    /// Emit a transcription success event
    pub fn transcription_success<T: Serialize + Clone>(
        app_handle: &AppHandle, 
        recording_id: &str, 
        response: &T
    ) {
        let _ = app_handle.emit(Events::TRANSCRIPTION_SUCCESS, (recording_id, response));
    }
    
    /// Emit a transcription failed event
    pub fn transcription_failed(app_handle: &AppHandle, recording_id: &str, error: &str) {
        let _ = app_handle.emit(Events::TRANSCRIPTION_FAILED, (recording_id, error));
    }
    
    /// Emit a meeting detected event
    pub fn meeting_detected<T: Serialize + Clone>(app_handle: &AppHandle, meeting_state: &T) {
        let _ = app_handle.emit(Events::MEETING_DETECTED, meeting_state);
    }
    
    /// Emit a meeting ended event
    pub fn meeting_ended(app_handle: &AppHandle) {
        let _ = app_handle.emit(Events::MEETING_ENDED, ());
    }
}