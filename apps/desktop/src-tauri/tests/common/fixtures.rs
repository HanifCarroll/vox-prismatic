/// Test fixtures for generating consistent test data
/// 
/// This module provides factory functions for creating test data structures
/// with realistic but controlled values for testing.

use chrono::{DateTime, Utc};
use serde_json::json;
use uuid::Uuid;

/// Creates a sample recording for testing matching the actual Recording struct
pub fn create_test_recording() -> serde_json::Value {
    json!({
        "id": Uuid::new_v4().to_string(),
        "filename": "test_recording_20240826_143022.wav",
        "duration": "01:00", // 1 minute in mm:ss format
        "timestamp": "2024-08-26T14:30:22Z",
        "status": "local"
    })
}

/// Creates a recording with the actual struct for direct testing
pub fn create_test_recording_struct() -> (String, String, String, String, String) {
    let id = Uuid::new_v4().to_string();
    let filename = "test_recording_20240826_143022.wav".to_string();
    let duration = "01:00".to_string();
    let timestamp = "2024-08-26T14:30:22Z".to_string();
    let status = "local".to_string();
    
    (id, filename, duration, timestamp, status)
}

/// Creates multiple test recordings with varied data
pub fn create_test_recordings(count: usize) -> Vec<Recording> {
    (0..count)
        .map(|i| {
            let timestamp = Utc::now() - chrono::Duration::hours(i as i64);
            Recording {
                id: Uuid::new_v4().to_string(),
                filename: format!("test_recording_{}_20240826_14302{}.wav", i, i),
                title: format!("Test Recording {}", i + 1),
                duration_ms: (30 + i * 15) as u64 * 1000, // Varying durations
                file_size_bytes: (512 + i * 256) * 1024, // Varying sizes
                timestamp,
                created_at: timestamp,
                updated_at: timestamp,
                metadata: json!({"index": i, "sample_rate": 44100}),
            }
        })
        .collect()
}

/// Creates a recording with corrupted/invalid data for error testing
pub fn create_corrupted_recording() -> serde_json::Value {
    json!({
        "id": "not-a-uuid",
        "filename": "", // Empty filename
        "title": null,
        "duration_ms": -1, // Invalid duration
        "file_size_bytes": "not-a-number",
        "timestamp": "invalid-date",
        "created_at": "2024-02-30T25:61:61Z", // Invalid date
        "metadata": "not-an-object"
    })
}

/// Creates a test meeting state
pub fn create_test_meeting_state(is_active: bool, app: Option<MeetingApp>) -> MeetingState {
    MeetingState {
        is_in_meeting: is_active,
        detected_app: app,
        started_at: if is_active { Some(Utc::now()) } else { None },
    }
}

/// Creates test meeting apps for testing detection
pub fn get_test_meeting_apps() -> Vec<(MeetingApp, &'static str)> {
    vec![
        (MeetingApp::Zoom, "zoom.us"),
        (MeetingApp::GoogleMeet, "meet.google.com"),
        (MeetingApp::MicrosoftTeams, "teams.microsoft.com"),
        (MeetingApp::SlackHuddle, "slack.com/huddle"),
        (MeetingApp::Discord, "discord.com/channels"),
        (MeetingApp::Unknown("Custom".to_string()), "custom-meeting-app.com"),
    ]
}

/// Creates a test recording state
pub fn create_test_recording_state() -> RecordingState {
    RecordingState {
        is_recording: false,
        current_recording_id: None,
        start_time: None,
        duration_ms: 0,
    }
}

/// Creates JSON metadata for testing serialization/deserialization
pub fn create_test_metadata_json() -> String {
    let recordings = create_test_recordings(3);
    serde_json::to_string_pretty(&recordings).expect("Failed to serialize test recordings")
}

/// Creates invalid JSON for testing error handling
pub fn create_invalid_json_samples() -> Vec<&'static str> {
    vec![
        "",                           // Empty string
        "{",                          // Incomplete JSON
        "null",                       // Null value
        "[]",                         // Empty array (valid JSON, invalid structure)
        r#"{"invalid": "missing_fields"}"#, // Missing required fields
        r#"[{"id": "duplicate"}, {"id": "duplicate"}]"#, // Duplicate IDs
        "not json at all",            // Not JSON
        r#"{"id": 123, "filename": true, "invalid_types": []}"#, // Wrong types
    ]
}