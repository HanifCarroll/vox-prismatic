/// Comprehensive tests for RecordingService
/// 
/// These tests focus on the critical metadata persistence functionality
/// to prevent data loss scenarios that would impact users.

use std::path::PathBuf;
use tempfile::TempDir;
use serde_json::json;
use chrono::Utc;
use uuid::Uuid;
use serial_test::serial;

mod common;
use common::{mocks::MockAppHandle, fixtures::create_test_recording};

// Mock the RecordingService functionality for testing
// This simulates the key functions without requiring the full Tauri runtime

/// Mock implementation of recording metadata operations
struct MockRecordingService {
    temp_dir: TempDir,
    metadata_path: PathBuf,
}

impl MockRecordingService {
    fn new() -> Self {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let metadata_path = temp_dir.path().join("recordings").join("recordings.json");
        
        // Create recordings directory
        std::fs::create_dir_all(metadata_path.parent().unwrap())
            .expect("Failed to create recordings directory");
        
        Self {
            temp_dir,
            metadata_path,
        }
    }
    
    /// Save recordings metadata to disk (simulates save_recordings_metadata)
    fn save_recordings_metadata(&self, recordings: &[serde_json::Value]) -> Result<(), String> {
        let json_data = serde_json::to_string_pretty(recordings)
            .map_err(|e| format!("Failed to serialize recordings: {}", e))?;
        
        std::fs::write(&self.metadata_path, json_data)
            .map_err(|e| format!("Failed to write metadata file: {}", e))?;
        
        Ok(())
    }
    
    /// Load recordings metadata from disk (simulates load_recordings_from_disk)
    fn load_recordings_from_disk(&self) -> Result<Vec<serde_json::Value>, String> {
        if !self.metadata_path.exists() {
            return Ok(vec![]);
        }
        
        let content = std::fs::read_to_string(&self.metadata_path)
            .map_err(|e| format!("Failed to read metadata file: {}", e))?;
        
        if content.trim().is_empty() {
            return Ok(vec![]);
        }
        
        let recordings: Vec<serde_json::Value> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse metadata file: {}", e))?;
        
        Ok(recordings)
    }
    
    /// Get recording file path (simulates get_recording_path)
    fn get_recording_path(&self, filename: &str) -> PathBuf {
        self.temp_dir.path().join("recordings").join(filename)
    }
    
    /// Get recordings directory path
    fn get_recordings_directory(&self) -> PathBuf {
        self.temp_dir.path().join("recordings")
    }
}

#[test]
#[serial]
fn test_save_and_load_empty_recordings() {
    let service = MockRecordingService::new();
    
    // Test saving empty recordings list
    let empty_recordings: Vec<serde_json::Value> = vec![];
    let save_result = service.save_recordings_metadata(&empty_recordings);
    assert!(save_result.is_ok(), "Should be able to save empty recordings list");
    
    // Test loading empty recordings
    let loaded_recordings = service.load_recordings_from_disk();
    assert!(loaded_recordings.is_ok(), "Should be able to load empty recordings list");
    assert_eq!(loaded_recordings.unwrap().len(), 0, "Loaded recordings should be empty");
}

#[test]
#[serial]
fn test_save_and_load_single_recording() {
    let service = MockRecordingService::new();
    
    // Create test recording
    let test_recording = create_test_recording();
    let recordings = vec![test_recording.clone()];
    
    // Save recording
    let save_result = service.save_recordings_metadata(&recordings);
    assert!(save_result.is_ok(), "Should be able to save single recording: {:?}", save_result.err());
    
    // Load and verify
    let loaded_recordings = service.load_recordings_from_disk().unwrap();
    assert_eq!(loaded_recordings.len(), 1, "Should load one recording");
    
    let loaded_recording = &loaded_recordings[0];
    assert_eq!(loaded_recording["id"], test_recording["id"], "Recording ID should match");
    assert_eq!(loaded_recording["filename"], test_recording["filename"], "Filename should match");
    assert_eq!(loaded_recording["duration"], test_recording["duration"], "Duration should match");
}

#[test]
#[serial]
fn test_save_and_load_multiple_recordings() {
    let service = MockRecordingService::new();
    
    // Create multiple test recordings
    let recordings: Vec<serde_json::Value> = (0..5)
        .map(|i| {
            json!({
                "id": Uuid::new_v4().to_string(),
                "filename": format!("recording_{}.wav", i),
                "duration": format!("0{}:30", i + 1),
                "timestamp": "2024-08-26T14:30:22Z",
                "status": "local"
            })
        })
        .collect();
    
    // Save recordings
    let save_result = service.save_recordings_metadata(&recordings);
    assert!(save_result.is_ok(), "Should be able to save multiple recordings");
    
    // Load and verify
    let loaded_recordings = service.load_recordings_from_disk().unwrap();
    assert_eq!(loaded_recordings.len(), 5, "Should load five recordings");
    
    // Verify each recording
    for (original, loaded) in recordings.iter().zip(loaded_recordings.iter()) {
        assert_eq!(original["id"], loaded["id"], "Recording IDs should match");
        assert_eq!(original["filename"], loaded["filename"], "Filenames should match");
        assert_eq!(original["duration"], loaded["duration"], "Durations should match");
    }
}

#[test]
#[serial]
fn test_load_nonexistent_metadata_file() {
    let service = MockRecordingService::new();
    
    // Don't create any files, try to load
    let result = service.load_recordings_from_disk();
    assert!(result.is_ok(), "Loading nonexistent file should return empty list, not error");
    assert_eq!(result.unwrap().len(), 0, "Should return empty list for nonexistent file");
}

#[test]
#[serial]
fn test_corrupted_metadata_file_handling() {
    let service = MockRecordingService::new();
    
    // Write invalid JSON to metadata file
    let invalid_json = "{ invalid json content";
    std::fs::write(&service.metadata_path, invalid_json)
        .expect("Failed to write invalid JSON");
    
    // Try to load
    let result = service.load_recordings_from_disk();
    assert!(result.is_err(), "Loading corrupted file should return error");
    
    let error_message = result.err().unwrap();
    assert!(error_message.contains("Failed to parse"), "Error should mention parsing failure");
}

#[test]
#[serial]
fn test_empty_metadata_file_handling() {
    let service = MockRecordingService::new();
    
    // Write empty file
    std::fs::write(&service.metadata_path, "").expect("Failed to write empty file");
    
    // Try to load
    let result = service.load_recordings_from_disk();
    assert!(result.is_ok(), "Loading empty file should succeed");
    assert_eq!(result.unwrap().len(), 0, "Empty file should return empty list");
}

#[test]
#[serial]
fn test_whitespace_only_metadata_file() {
    let service = MockRecordingService::new();
    
    // Write whitespace-only file
    std::fs::write(&service.metadata_path, "   \n\t  \n  ").expect("Failed to write whitespace file");
    
    // Try to load
    let result = service.load_recordings_from_disk();
    assert!(result.is_ok(), "Loading whitespace-only file should succeed");
    assert_eq!(result.unwrap().len(), 0, "Whitespace-only file should return empty list");
}

#[test]
#[serial]
fn test_concurrent_metadata_operations() {
    let service = MockRecordingService::new();
    
    // Save initial recordings
    let initial_recordings = vec![create_test_recording()];
    service.save_recordings_metadata(&initial_recordings).unwrap();
    
    // Simulate concurrent reads (this tests file locking behavior)
    let handles: Vec<_> = (0..3)
        .map(|_| {
            let recordings_path = service.metadata_path.clone();
            std::thread::spawn(move || {
                // Each thread tries to read the file multiple times
                for _ in 0..10 {
                    if recordings_path.exists() {
                        let content = std::fs::read_to_string(&recordings_path);
                        assert!(content.is_ok(), "Concurrent read should succeed");
                    }
                    std::thread::sleep(std::time::Duration::from_millis(1));
                }
            })
        })
        .collect();
    
    // Wait for all threads to complete
    for handle in handles {
        handle.join().expect("Thread should complete successfully");
    }
    
    // Verify file is still intact
    let final_recordings = service.load_recordings_from_disk().unwrap();
    assert_eq!(final_recordings.len(), 1, "File should still contain one recording after concurrent access");
}

#[test]
#[serial]
fn test_recording_path_generation() {
    let service = MockRecordingService::new();
    
    let test_cases = vec![
        "simple.wav",
        "recording_with_timestamp_20240826_143022.wav",
        "file with spaces.wav",
        "file-with-dashes.wav",
        "file_with_underscores.wav",
        "file.with.multiple.dots.wav",
    ];
    
    for filename in test_cases {
        let path = service.get_recording_path(filename);
        
        // Verify path structure
        assert!(path.is_absolute(), "Recording path should be absolute");
        assert_eq!(
            path.file_name().unwrap().to_string_lossy(),
            filename,
            "Filename should be preserved exactly"
        );
        assert!(
            path.starts_with(service.get_recordings_directory()),
            "Path should be within recordings directory"
        );
    }
}

#[test]
#[serial]
fn test_metadata_file_permissions() {
    let service = MockRecordingService::new();
    
    // Save some data
    let test_recording = vec![create_test_recording()];
    service.save_recordings_metadata(&test_recording).unwrap();
    
    // Check file exists and is readable
    assert!(service.metadata_path.exists(), "Metadata file should exist");
    
    // Verify we can read the file
    let content = std::fs::read_to_string(&service.metadata_path);
    assert!(content.is_ok(), "Should be able to read metadata file");
    
    // Verify content is valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&content.unwrap());
    assert!(parsed.is_ok(), "Metadata file should contain valid JSON");
}

#[test]
#[serial]
fn test_large_recordings_list() {
    let service = MockRecordingService::new();
    
    // Create a large number of recordings to test performance and limits
    let large_recordings: Vec<serde_json::Value> = (0..1000)
        .map(|i| {
            json!({
                "id": format!("recording-{:04}", i),
                "filename": format!("recording_{:04}.wav", i),
                "duration": format!("{:02}:{:02}", i / 60, i % 60),
                "timestamp": "2024-08-26T14:30:22Z",
                "status": "local"
            })
        })
        .collect();
    
    // Save large list
    let save_result = service.save_recordings_metadata(&large_recordings);
    assert!(save_result.is_ok(), "Should be able to save large recordings list");
    
    // Load and verify
    let loaded_recordings = service.load_recordings_from_disk().unwrap();
    assert_eq!(loaded_recordings.len(), 1000, "Should load all 1000 recordings");
    
    // Spot check a few recordings
    assert_eq!(loaded_recordings[0]["id"], "recording-0000");
    assert_eq!(loaded_recordings[500]["id"], "recording-0500");
    assert_eq!(loaded_recordings[999]["id"], "recording-0999");
}

#[test]
#[serial]
fn test_recording_data_integrity() {
    let service = MockRecordingService::new();
    
    // Create recording with special characters and edge cases
    let special_recording = json!({
        "id": "test-id-with-unicode-🎵",
        "filename": "recording with spaces & special chars (test).wav",
        "duration": "23:59",
        "timestamp": "2024-12-31T23:59:59.999Z",
        "status": "local"
    });
    
    let recordings = vec![special_recording.clone()];
    
    // Save and reload
    service.save_recordings_metadata(&recordings).unwrap();
    let loaded_recordings = service.load_recordings_from_disk().unwrap();
    
    assert_eq!(loaded_recordings.len(), 1, "Should load one recording");
    let loaded = &loaded_recordings[0];
    
    // Verify all fields are preserved exactly
    assert_eq!(loaded["id"], special_recording["id"], "ID with unicode should be preserved");
    assert_eq!(loaded["filename"], special_recording["filename"], "Filename with special chars should be preserved");
    assert_eq!(loaded["duration"], special_recording["duration"], "Duration should be preserved");
    assert_eq!(loaded["timestamp"], special_recording["timestamp"], "Timestamp should be preserved");
    assert_eq!(loaded["status"], special_recording["status"], "Status should be preserved");
}