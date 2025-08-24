use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use crate::meeting_detector::MeetingDetector;

/// Represents a single audio recording with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recording {
    pub id: String,
    pub filename: String,
    pub duration: String,
    pub timestamp: DateTime<Utc>,
    pub status: RecordingStatus,
}

/// Status of a recording in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecordingStatus {
    Local,     // Recorded locally, not yet uploaded
    Uploaded,  // Successfully uploaded/processed
    Failed,    // Upload or processing failed
}

/// Current state of the recording system
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

/// Current state of audio playback
#[derive(Debug, Clone)]
pub enum PlaybackState {
    Idle,
    Playing { 
        recording_id: String,
        filename: String,
        start_time: DateTime<Utc>,
    },
}

/// Main application state containing all shared data
#[derive(Debug, Clone)]
pub struct AppState {
    pub recording_state: Arc<Mutex<RecordingState>>,
    pub playback_state: Arc<Mutex<PlaybackState>>,
    pub recordings: Arc<Mutex<Vec<Recording>>>,
    pub audio_recorder: Arc<Mutex<crate::audio_system::RecorderState>>,
    pub meeting_detector: Arc<MeetingDetector>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            recording_state: Arc::new(Mutex::new(RecordingState::Idle)),
            playback_state: Arc::new(Mutex::new(PlaybackState::Idle)),
            recordings: Arc::new(Mutex::new(Vec::new())),
            audio_recorder: Arc::new(Mutex::new(crate::audio_system::RecorderState::new())),
            meeting_detector: Arc::new(MeetingDetector::new()),
        }
    }
}

impl AppState {
    /// Initialize the audio system for this app state
    pub fn initialize_audio_system(&self) -> Result<(), String> {
        let mut audio_recorder = self.audio_recorder.lock().unwrap();
        audio_recorder.initialize()
    }
}