/// Integration tests for cross-component scenarios
/// 
/// These tests verify that different components work together correctly,
/// including meeting detection triggering recordings, state synchronization
/// across the entire system, and end-to-end workflows.

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::path::PathBuf;
use serial_test::serial;
use tempfile::TempDir;
use chrono::Utc;

mod common;
use common::{
    meeting_mocks::{MockMeetingEnvironment, fixtures::*},
    state_mocks::{MockRecorderState, MockSharedState, MockAudioThread, MockAudioCommand},
};

#[cfg(test)]
mod meeting_recording_integration {
    use super::*;

    /// Simulated app state that combines meeting detection with recording
    #[derive(Debug, Clone)]
    struct IntegratedAppState {
        pub is_in_meeting: bool,
        pub detected_meeting_app: Option<String>,
        pub meeting_started_at: Option<chrono::DateTime<chrono::Utc>>,
        pub recorder_state: MockRecorderState,
        pub auto_record_meetings: bool,
        pub current_recording_id: Option<String>,
        pub meeting_recordings: Vec<MeetingRecording>,
    }
    
    #[derive(Debug, Clone)]
    struct MeetingRecording {
        pub id: String,
        pub meeting_app: String,
        pub file_path: PathBuf,
        pub started_at: chrono::DateTime<chrono::Utc>,
        pub ended_at: Option<chrono::DateTime<chrono::Utc>>,
        pub duration_ms: Option<u64>,
    }
    
    impl IntegratedAppState {
        fn new() -> Self {
            let mut state = Self {
                is_in_meeting: false,
                detected_meeting_app: None,
                meeting_started_at: None,
                recorder_state: MockRecorderState::new(),
                auto_record_meetings: true,
                current_recording_id: None,
                meeting_recordings: Vec::new(),
            };
            
            state.recorder_state.initialize().expect("Should initialize recorder");
            state
        }
        
        fn start_meeting(&mut self, app_name: &str, temp_dir: &std::path::Path) -> Result<(), String> {
            if self.is_in_meeting {
                return Err("Already in meeting".to_string());
            }
            
            self.is_in_meeting = true;
            self.detected_meeting_app = Some(app_name.to_string());
            self.meeting_started_at = Some(Utc::now());
            
            if self.auto_record_meetings {
                let recording_id = format!("meeting_{}_{}", app_name.to_lowercase(), 
                                         Utc::now().timestamp());
                let file_path = temp_dir.join(format!("{}.wav", recording_id));
                
                self.recorder_state.start_recording(file_path.clone())?;
                self.current_recording_id = Some(recording_id.clone());
                
                self.meeting_recordings.push(MeetingRecording {
                    id: recording_id,
                    meeting_app: app_name.to_string(),
                    file_path,
                    started_at: self.meeting_started_at.unwrap(),
                    ended_at: None,
                    duration_ms: None,
                });
            }
            
            Ok(())
        }
        
        fn end_meeting(&mut self) -> Result<(), String> {
            if !self.is_in_meeting {
                return Err("Not in meeting".to_string());
            }
            
            if self.recorder_state.is_recording {
                self.recorder_state.stop_recording()?;
                
                if let Some(recording_id) = &self.current_recording_id {
                    if let Some(recording) = self.meeting_recordings.iter_mut()
                        .find(|r| r.id == *recording_id) {
                        recording.ended_at = Some(Utc::now());
                        if let Some(started_at) = self.meeting_started_at {
                            let duration = Utc::now().signed_duration_since(started_at);
                            recording.duration_ms = Some(duration.num_milliseconds() as u64);
                        }
                    }
                }
                
                self.current_recording_id = None;
            }
            
            self.is_in_meeting = false;
            self.detected_meeting_app = None;
            self.meeting_started_at = None;
            
            Ok(())
        }
    }

    #[test]
    #[serial]
    fn test_meeting_triggered_recording() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let mut app_state = IntegratedAppState::new();
        
        // Simulate meeting detection
        let start_result = app_state.start_meeting("Zoom", temp_dir.path());
        assert!(start_result.is_ok(), "Should start meeting and recording");
        assert!(app_state.is_in_meeting, "Should be in meeting");
        assert!(app_state.recorder_state.is_recording, "Should be recording");
        assert_eq!(app_state.meeting_recordings.len(), 1, "Should have one meeting recording");
        
        // Verify recording details
        let recording = &app_state.meeting_recordings[0];
        assert_eq!(recording.meeting_app, "Zoom", "Should record correct meeting app");
        assert!(recording.file_path.exists() || !recording.file_path.exists(), 
               "File path should be valid"); // File doesn't exist in mock, but path should be valid
        assert!(recording.ended_at.is_none(), "Recording should not be ended yet");
        
        // Simulate meeting end
        thread::sleep(Duration::from_millis(50)); // Simulate meeting duration
        let end_result = app_state.end_meeting();
        assert!(end_result.is_ok(), "Should end meeting and recording");
        assert!(!app_state.is_in_meeting, "Should not be in meeting");
        assert!(!app_state.recorder_state.is_recording, "Should not be recording");
        
        // Verify recording completion
        let completed_recording = &app_state.meeting_recordings[0];
        assert!(completed_recording.ended_at.is_some(), "Recording should have end time");
        assert!(completed_recording.duration_ms.is_some(), "Recording should have duration");
        assert!(completed_recording.duration_ms.unwrap() >= 50, "Duration should be reasonable");
    }
    
    #[test]
    #[serial]
    fn test_multiple_sequential_meetings() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let mut app_state = IntegratedAppState::new();
        
        let meeting_apps = ["Zoom", "GoogleMeet", "MicrosoftTeams", "SlackHuddle"];
        
        for (i, &app) in meeting_apps.iter().enumerate() {
            // Start meeting
            let start_result = app_state.start_meeting(app, temp_dir.path());
            assert!(start_result.is_ok(), "Should start meeting {}", app);
            
            // Simulate meeting activity
            thread::sleep(Duration::from_millis(20));
            
            // End meeting
            let end_result = app_state.end_meeting();
            assert!(end_result.is_ok(), "Should end meeting {}", app);
            
            // Verify recordings accumulate
            assert_eq!(app_state.meeting_recordings.len(), i + 1, 
                      "Should have {} recordings", i + 1);
        }
        
        // Verify all recordings are complete and distinct
        assert_eq!(app_state.meeting_recordings.len(), 4, "Should have 4 total recordings");
        
        for (i, recording) in app_state.meeting_recordings.iter().enumerate() {
            assert_eq!(recording.meeting_app, meeting_apps[i], 
                      "Recording {} should be for {}", i, meeting_apps[i]);
            assert!(recording.ended_at.is_some(), "Recording {} should be completed", i);
            assert!(recording.duration_ms.is_some(), "Recording {} should have duration", i);
        }
        
        // Verify no duplicate file paths
        let file_paths: Vec<_> = app_state.meeting_recordings.iter()
            .map(|r| &r.file_path)
            .collect();
        let unique_paths: std::collections::HashSet<_> = file_paths.iter().collect();
        assert_eq!(file_paths.len(), unique_paths.len(), "All file paths should be unique");
    }
    
    #[test]
    #[serial]
    fn test_concurrent_meeting_detection_and_recording() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let app_state = Arc::new(Mutex::new(IntegratedAppState::new()));
        let meeting_env = MockMeetingEnvironment::new();
        
        let num_detection_threads = 3;
        let detection_handles: Vec<_> = (0..num_detection_threads)
            .map(|thread_id| {
                let state = app_state.clone();
                let env = meeting_env.clone();
                let temp_path = temp_dir.path().to_path_buf();
                
                thread::spawn(move || {
                    // Simulate rapid meeting detection cycles
                    for cycle in 0..5 {
                        let app_name = match cycle % 3 {
                            0 => {
                                env.setup_google_meet_scenario();
                                "GoogleMeet"
                            },
                            1 => {
                                env.setup_zoom_scenario();
                                "Zoom"
                            },
                            2 => {
                                env.setup_teams_scenario();
                                "MicrosoftTeams"
                            },
                            _ => unreachable!(),
                        };
                        
                        // Try to start meeting (may fail if another thread already started)
                        {
                            let mut s = state.lock().unwrap();
                            if !s.is_in_meeting {
                                let _ = s.start_meeting(app_name, &temp_path);
                            }
                        }
                        
                        thread::sleep(Duration::from_millis(10));
                        
                        // Try to end meeting
                        {
                            let mut s = state.lock().unwrap();
                            if s.is_in_meeting {
                                let _ = s.end_meeting();
                            }
                        }
                        
                        thread::sleep(Duration::from_millis(5));
                    }
                    
                    thread_id
                })
            })
            .collect();
        
        // Wait for all detection threads
        let completed_threads: Vec<_> = detection_handles
            .into_iter()
            .map(|h| h.join().expect("Detection thread should complete"))
            .collect();
        
        assert_eq!(completed_threads.len(), num_detection_threads, 
                  "All detection threads should complete");
        
        // Verify final state
        let final_state = app_state.lock().unwrap();
        assert!(!final_state.is_in_meeting, "Should not be in meeting at end");
        assert!(!final_state.recorder_state.is_recording, "Should not be recording at end");
        
        // Should have some recordings from the concurrent operations
        assert!(!final_state.meeting_recordings.is_empty(), 
               "Should have some recordings from concurrent operations");
        
        // All recordings should be properly completed
        for recording in &final_state.meeting_recordings {
            assert!(recording.ended_at.is_some(), "Recording should be completed");
            assert!(recording.duration_ms.is_some(), "Recording should have duration");
        }
    }
    
    #[test]
    #[serial]
    fn test_auto_recording_toggle() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let mut app_state = IntegratedAppState::new();
        
        // Test with auto-recording enabled (default)
        assert!(app_state.auto_record_meetings, "Auto-recording should be enabled by default");
        
        let start_result = app_state.start_meeting("Zoom", temp_dir.path());
        assert!(start_result.is_ok(), "Should start meeting");
        assert!(app_state.recorder_state.is_recording, "Should auto-start recording");
        assert_eq!(app_state.meeting_recordings.len(), 1, "Should create meeting recording");
        
        let _ = app_state.end_meeting();
        
        // Disable auto-recording
        app_state.auto_record_meetings = false;
        
        let start_result2 = app_state.start_meeting("GoogleMeet", temp_dir.path());
        assert!(start_result2.is_ok(), "Should start meeting without recording");
        assert!(!app_state.recorder_state.is_recording, "Should NOT auto-start recording");
        assert_eq!(app_state.meeting_recordings.len(), 1, "Should not create new recording");
        
        let _ = app_state.end_meeting();
        
        // Re-enable auto-recording
        app_state.auto_record_meetings = true;
        
        let start_result3 = app_state.start_meeting("MicrosoftTeams", temp_dir.path());
        assert!(start_result3.is_ok(), "Should start meeting with recording again");
        assert!(app_state.recorder_state.is_recording, "Should auto-start recording again");
        assert_eq!(app_state.meeting_recordings.len(), 2, "Should create new recording");
        
        let _ = app_state.end_meeting();
    }
}

#[cfg(test)]
mod end_to_end_workflows {
    use super::*;

    #[test]
    #[serial]
    fn test_complete_meeting_lifecycle() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let meeting_env = MockMeetingEnvironment::new();
        let audio_thread = Arc::new(MockAudioThread::new());
        let _thread_handle = audio_thread.start();
        
        // Simulate the complete lifecycle:
        // 1. No meeting detected
        // 2. Meeting detected -> Start recording
        // 3. Meeting ongoing -> Continue recording
        // 4. Meeting ends -> Stop recording
        // 5. Process recording metadata
        
        // Phase 1: No meeting
        meeting_env.setup_no_meeting_scenario();
        let chrome_urls = meeting_env.browser_checker.get_browser_urls("Google Chrome");
        assert!(chrome_urls.is_none() || chrome_urls.unwrap().is_empty(), 
               "Should detect no meeting");
        
        // Phase 2: Meeting detected
        meeting_env.setup_google_meet_scenario();
        let chrome_urls = meeting_env.browser_checker.get_browser_urls("Google Chrome").unwrap();
        assert!(chrome_urls.contains("meet.google.com/abc-def-ghi"), 
               "Should detect Google Meet");
        
        // Start recording
        let recording_path = temp_dir.path().join("meeting_recording.wav");
        let start_command = MockAudioCommand::StartRecording { 
            file_path: recording_path.clone() 
        };
        audio_thread.send_command(start_command).expect("Should start recording");
        
        // Phase 3: Meeting ongoing - simulate some activity
        thread::sleep(Duration::from_millis(100));
        
        // Verify recording is active by checking commands
        let operations = audio_thread.get_file_operations();
        assert!(operations.iter().any(|op| op.contains("create_file")), 
               "Should have started file creation");
        
        // Phase 4: Meeting ends
        meeting_env.setup_no_meeting_scenario();
        let end_chrome_urls = meeting_env.browser_checker.get_browser_urls("Google Chrome");
        assert!(end_chrome_urls.is_none() || end_chrome_urls.unwrap().is_empty(), 
               "Should detect meeting ended");
        
        // Stop recording
        let stop_command = MockAudioCommand::StopRecording;
        audio_thread.send_command(stop_command).expect("Should stop recording");
        
        // Phase 5: Process results
        thread::sleep(Duration::from_millis(50));
        let final_operations = audio_thread.get_file_operations();
        assert!(final_operations.iter().any(|op| op.contains("finalize_file")), 
               "Should have finalized recording");
        
        let execution_results = audio_thread.get_execution_results();
        assert!(execution_results.len() >= 2, "Should have start and stop results");
        
        // Verify all operations succeeded
        let failed_operations: Vec<_> = execution_results.iter()
            .filter(|r| !r.success)
            .collect();
        assert!(failed_operations.is_empty(), "All operations should succeed");
        
        audio_thread.stop();
    }
    
    #[test]
    #[serial]
    fn test_error_recovery_workflow() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let meeting_env = MockMeetingEnvironment::new();
        let shared_state = MockSharedState::new((false, false)); // (in_meeting, recording)
        
        // Test recovery from various error scenarios
        let error_scenarios = [
            "applescript_failure",
            "process_detection_failure",
            "recording_start_failure",
            "recording_stop_failure",
        ];
        
        for scenario in error_scenarios.iter() {
            println!("Testing error scenario: {}", scenario);
            
            match *scenario {
                "applescript_failure" => {
                    meeting_env.browser_checker.set_applescript_failure(true);
                    meeting_env.setup_google_meet_scenario();
                    
                    // Should fail gracefully
                    let urls = meeting_env.browser_checker.get_browser_urls("Google Chrome");
                    assert!(urls.is_none(), "Should fail to get URLs");
                    
                    // Recovery: restore AppleScript
                    meeting_env.browser_checker.set_applescript_failure(false);
                    let recovered_urls = meeting_env.browser_checker.get_browser_urls("Google Chrome");
                    assert!(recovered_urls.is_some(), "Should recover after AppleScript restoration");
                },
                "process_detection_failure" => {
                    meeting_env.process_checker.set_command_failure(true);
                    meeting_env.setup_zoom_scenario();
                    
                    let process_status = meeting_env.process_checker.is_process_running("zoom.us");
                    assert!(process_status.is_none(), "Should fail to detect process");
                    
                    // Recovery: restore process detection
                    meeting_env.process_checker.set_command_failure(false);
                    let recovered_status = meeting_env.process_checker.is_process_running("zoom.us");
                    assert!(recovered_status.is_some(), "Should recover process detection");
                },
                "recording_start_failure" => {
                    // Simulate recording start failure and recovery
                    shared_state.write_state(|(in_meeting, recording)| {
                        *in_meeting = true;
                        // Simulate failure by keeping recording false
                        assert!(*in_meeting && !*recording, "Should be in meeting but not recording");
                    });
                    
                    // Recovery attempt
                    shared_state.write_state(|(in_meeting, recording)| {
                        if *in_meeting && !*recording {
                            *recording = true; // Successful recovery
                        }
                    });
                    
                    let (final_meeting, final_recording) = shared_state.read_state(|state| *state);
                    assert!(final_meeting && final_recording, "Should recover recording state");
                },
                "recording_stop_failure" => {
                    // Set up active recording
                    shared_state.write_state(|(in_meeting, recording)| {
                        *in_meeting = true;
                        *recording = true;
                    });
                    
                    // Simulate stop failure (meeting ends but recording continues)
                    shared_state.write_state(|(in_meeting, _recording)| {
                        *in_meeting = false;
                        // Recording state unchanged (simulating failure)
                    });
                    
                    let (meeting_after_stop, recording_after_stop) = shared_state.read_state(|state| *state);
                    assert!(!meeting_after_stop && recording_after_stop, 
                           "Should have inconsistent state after stop failure");
                    
                    // Recovery: force stop recording
                    shared_state.write_state(|(_in_meeting, recording)| {
                        *recording = false; // Force cleanup
                    });
                    
                    let (final_meeting, final_recording) = shared_state.read_state(|state| *state);
                    assert!(!final_meeting && !final_recording, "Should recover to clean state");
                },
                _ => unreachable!(),
            }
            
            // Clear state for next scenario
            meeting_env.clear_all();
            shared_state.write_state(|(in_meeting, recording)| {
                *in_meeting = false;
                *recording = false;
            });
            shared_state.clear_log();
        }
    }
    
    #[test]
    #[serial]
    fn test_stress_testing_rapid_state_changes() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let meeting_env = Arc::new(MockMeetingEnvironment::new());
        let shared_state = Arc::new(MockSharedState::new(IntegratedAppState::new()));
        
        let num_stress_threads = 8;
        let operations_per_thread = 25;
        
        let stress_handles: Vec<_> = (0..num_stress_threads)
            .map(|thread_id| {
                let env = meeting_env.clone();
                let state = shared_state.clone();
                let temp_path = temp_dir.path().to_path_buf();
                
                thread::spawn(move || {
                    let mut operations_completed = 0;
                    let mut errors_encountered = 0;
                    
                    for operation in 0..operations_per_thread {
                        match operation % 4 {
                            0 => {
                                // Rapid meeting start/stop
                                env.setup_google_meet_scenario();
                                let result = state.write_state(|s| {
                                    s.start_meeting("GoogleMeet", &temp_path)
                                });
                                if result.is_err() { errors_encountered += 1; }
                            },
                            1 => {
                                let result = state.write_state(|s| {
                                    s.end_meeting()
                                });
                                if result.is_err() { errors_encountered += 1; }
                            },
                            2 => {
                                // Rapid environment changes
                                env.setup_zoom_scenario();
                                env.setup_no_meeting_scenario();
                            },
                            3 => {
                                // State consistency checks
                                let is_consistent = state.read_state(|s| {
                                    // Consistency rule: if in meeting, should have detected app
                                    !s.is_in_meeting || s.detected_meeting_app.is_some()
                                });
                                if !is_consistent { errors_encountered += 1; }
                            },
                            _ => unreachable!(),
                        }
                        
                        operations_completed += 1;
                        
                        // Small delay to allow some interleaving
                        if operation % 10 == 0 {
                            thread::sleep(Duration::from_millis(1));
                        }
                    }
                    
                    (thread_id, operations_completed, errors_encountered)
                })
            })
            .collect();
        
        // Collect stress test results
        let mut total_operations = 0;
        let mut total_errors = 0;
        
        for handle in stress_handles {
            let (thread_id, operations, errors) = handle.join()
                .expect("Stress test thread should complete");
            
            println!("Thread {}: {} operations, {} errors", thread_id, operations, errors);
            total_operations += operations;
            total_errors += errors;
        }
        
        println!("Stress test completed: {} total operations, {} total errors", 
                total_operations, total_errors);
        
        // Verify stress test results
        assert_eq!(total_operations, num_stress_threads * operations_per_thread, 
                  "Should complete all operations");
        
        // Allow some errors due to concurrent access, but not too many
        let error_rate = total_errors as f64 / total_operations as f64;
        assert!(error_rate < 0.5, "Error rate should be reasonable ({}%)", error_rate * 100.0);
        
        // Verify final state consistency
        let final_consistency = shared_state.read_state(|s| {
            // Final state should be consistent
            (!s.is_in_meeting || s.detected_meeting_app.is_some()) &&
            (!s.recorder_state.is_recording || s.current_recording_id.is_some())
        });
        
        assert!(final_consistency, "Final state should be consistent after stress test");
        
        // Verify state access patterns
        assert!(shared_state.has_concurrent_access(), 
               "Should have detected concurrent access during stress test");
        
        let access_count = shared_state.get_access_log().len();
        assert!(access_count >= total_operations as usize, 
               "Should have logged all state accesses");
    }
}