/// Comprehensive tests for state management patterns
/// 
/// These tests focus on Arc<Mutex<T>> synchronization, thread-safe operations,
/// command channel communication, and state consistency across concurrent operations.

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::path::PathBuf;
use serial_test::serial;
use tempfile::TempDir;

mod common;
use common::state_mocks::{
    MockAudioThread, MockCommandSender, MockSharedState, MockRecorderState,
    MockAudioCommand, AccessType, run_concurrent_operations, wait_for_threads
};

#[cfg(test)]
mod arc_mutex_synchronization_tests {
    use super::*;

    #[test]
    #[serial]
    fn test_basic_arc_mutex_sharing() {
        // Test basic Arc<Mutex<T>> sharing between threads
        let shared_counter = Arc::new(Mutex::new(0u32));
        let num_threads = 10;
        let increments_per_thread = 100;
        
        let handles: Vec<_> = (0..num_threads)
            .map(|_| {
                let counter = shared_counter.clone();
                thread::spawn(move || {
                    for _ in 0..increments_per_thread {
                        let mut count = counter.lock().unwrap();
                        *count += 1;
                    }
                })
            })
            .collect();
        
        // Wait for all threads to complete
        for handle in handles {
            handle.join().expect("Thread should complete");
        }
        
        let final_count = *shared_counter.lock().unwrap();
        assert_eq!(final_count, num_threads * increments_per_thread, 
                  "All increments should be applied atomically");
    }
    
    #[test]
    #[serial]
    fn test_concurrent_read_write_operations() {
        let shared_state = MockSharedState::new(vec![1, 2, 3, 4, 5]);
        let shared_state_arc = Arc::new(shared_state);
        
        // Spawn multiple readers and writers
        let readers: Vec<_> = (0..5)
            .map(|i| {
                let state = shared_state_arc.clone();
                thread::spawn(move || {
                    for _ in 0..10 {
                        let sum = state.read_state(|vec| vec.iter().sum::<i32>());
                        assert!(sum >= 15, "Sum should be at least 15 (reader {})", i);
                        thread::sleep(Duration::from_millis(1));
                    }
                })
            })
            .collect();
        
        let writers: Vec<_> = (0..3)
            .map(|i| {
                let state = shared_state_arc.clone();
                thread::spawn(move || {
                    for j in 0..5 {
                        state.write_state(|vec| {
                            vec.push((i * 10 + j) as i32);
                        });
                        thread::sleep(Duration::from_millis(2));
                    }
                })
            })
            .collect();
        
        // Wait for completion
        for handle in readers.into_iter().chain(writers) {
            handle.join().expect("Thread should complete");
        }
        
        // Verify final state
        let final_state = shared_state_arc.read_state(|vec| vec.clone());
        assert_eq!(final_state.len(), 20, "Should have original 5 + 15 added elements");
        
        // Check access patterns
        assert!(shared_state_arc.has_concurrent_access(), 
               "Should have detected concurrent access");
        
        let access_log = shared_state_arc.get_access_log();
        assert!(access_log.len() >= 65, "Should have logged all read/write operations");
        
        let modification_count = shared_state_arc.get_modification_count();
        assert_eq!(modification_count, 15, "Should have counted all modifications");
    }
    
    #[test]
    #[serial]  
    fn test_deadlock_prevention() {
        // Test that our Arc<Mutex<T>> usage doesn't create deadlocks
        let state1 = Arc::new(Mutex::new(0u32));
        let state2 = Arc::new(Mutex::new(0u32));
        
        let state1_clone = state1.clone();
        let state2_clone = state2.clone();
        
        // Thread 1: Lock state1 then state2
        let handle1 = thread::spawn(move || {
            for _ in 0..50 {
                let _guard1 = state1_clone.lock().unwrap();
                thread::sleep(Duration::from_millis(1));
                let _guard2 = state2_clone.lock().unwrap();
                // Do some work
                thread::sleep(Duration::from_millis(1));
            }
        });
        
        let state1_clone2 = state1.clone();
        let state2_clone2 = state2.clone();
        
        // Thread 2: Lock state2 then state1 (potential deadlock scenario)
        let handle2 = thread::spawn(move || {
            for _ in 0..50 {
                let _guard2 = state2_clone2.lock().unwrap();
                thread::sleep(Duration::from_millis(1));
                let _guard1 = state1_clone2.lock().unwrap();
                // Do some work
                thread::sleep(Duration::from_millis(1));
            }
        });
        
        // This should complete without hanging (no deadlock)
        let result1 = handle1.join();
        let result2 = handle2.join();
        
        assert!(result1.is_ok(), "Thread 1 should complete without deadlock");
        assert!(result2.is_ok(), "Thread 2 should complete without deadlock");
    }
    
    #[test]
    #[serial]
    fn test_mutex_poisoning_recovery() {
        let shared_data = Arc::new(Mutex::new(Vec::<i32>::new()));
        let shared_data_clone = shared_data.clone();
        
        // Create a thread that will panic while holding the mutex
        let panicking_handle = thread::spawn(move || {
            let mut data = shared_data_clone.lock().unwrap();
            data.push(42);
            panic!("Intentional panic to poison mutex");
        });
        
        // Wait for the panicking thread to complete
        let result = panicking_handle.join();
        assert!(result.is_err(), "Thread should have panicked");
        
        // Try to use the poisoned mutex
        let lock_result = shared_data.lock();
        assert!(lock_result.is_err(), "Mutex should be poisoned");
        
        // Recover from poisoned mutex
        match lock_result {
            Err(poisoned) => {
                let data = poisoned.into_inner();
                assert_eq!(data.len(), 1, "Data should still be accessible");
                assert_eq!(data[0], 42, "Data should be correct");
            }
            Ok(_) => panic!("Expected poisoned mutex"),
        }
    }
}

#[cfg(test)]
mod recorder_state_tests {
    use super::*;

    #[test]
    #[serial]
    fn test_recorder_state_lifecycle() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let file_path = temp_dir.path().join("test_recording.wav");
        
        let mut recorder = MockRecorderState::new();
        
        // Test initial state
        assert!(!recorder.is_recording, "Should not be recording initially");
        assert!(!recorder.is_initialized(), "Should not be initialized initially");
        assert!(recorder.current_file_path.is_none(), "Should have no current file initially");
        
        // Test initialization
        let init_result = recorder.initialize();
        assert!(init_result.is_ok(), "Initialization should succeed");
        assert!(recorder.is_initialized(), "Should be initialized after init");
        
        // Test double initialization
        let double_init = recorder.initialize();
        assert!(double_init.is_err(), "Double initialization should fail");
        
        // Test start recording
        let start_result = recorder.start_recording(file_path.clone());
        assert!(start_result.is_ok(), "Start recording should succeed");
        assert!(recorder.is_recording, "Should be recording after start");
        assert_eq!(recorder.current_file_path, Some(file_path.clone()), "File path should be set");
        
        // Test double start
        let double_start = recorder.start_recording(temp_dir.path().join("another.wav"));
        assert!(double_start.is_err(), "Double start should fail");
        
        // Test recording duration
        thread::sleep(Duration::from_millis(10));
        let duration = recorder.get_recording_duration();
        assert!(duration.is_some(), "Should have recording duration");
        assert!(duration.unwrap() >= Duration::from_millis(10), "Duration should be reasonable");
        
        // Test stop recording
        let stop_result = recorder.stop_recording();
        assert!(stop_result.is_ok(), "Stop recording should succeed");
        assert!(!recorder.is_recording, "Should not be recording after stop");
        assert!(recorder.current_file_path.is_none(), "File path should be cleared");
        
        // Test double stop
        let double_stop = recorder.stop_recording();
        assert!(double_stop.is_err(), "Double stop should fail");
        
        // Test cleanup
        recorder.cleanup();
        assert!(!recorder.is_initialized(), "Should not be initialized after cleanup");
    }
    
    #[test]
    #[serial]
    fn test_concurrent_recorder_state_access() {
        let recorder = Arc::new(Mutex::new(MockRecorderState::new()));
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        // Initialize recorder
        {
            let mut r = recorder.lock().unwrap();
            r.initialize().expect("Initialization should succeed");
        }
        
        let num_operations = 20;
        let operations: Vec<_> = (0..num_operations)
            .map(|i| {
                let recorder = recorder.clone();
                let file_path = temp_dir.path().join(format!("recording_{}.wav", i));
                
                move || {
                    let mut r = recorder.lock().unwrap();
                    
                    if !r.is_recording {
                        let _ = r.start_recording(file_path);
                        thread::sleep(Duration::from_millis(5));
                        let _ = r.stop_recording();
                    }
                }
            })
            .collect();
        
        let handles = run_concurrent_operations(operations, 1);
        let result = wait_for_threads(handles);
        assert!(result.is_ok(), "All concurrent operations should complete");
        
        // Verify final state
        let final_recorder = recorder.lock().unwrap();
        assert!(!final_recorder.is_recording, "Should not be recording at end");
        assert!(final_recorder.is_initialized(), "Should still be initialized");
    }
    
    #[test]
    #[serial]
    fn test_command_sender_reliability() {
        let sender = MockCommandSender::<MockAudioCommand>::new();
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        // Test normal operation
        let file_path = temp_dir.path().join("test.wav");
        let send_result = sender.send(MockAudioCommand::StartRecording { file_path: file_path.clone() });
        assert!(send_result.is_ok(), "Normal send should succeed");
        
        let commands = sender.get_sent_commands();
        assert_eq!(commands.len(), 1, "Should have one sent command");
        
        // Test failure mode
        sender.set_failure(true, Some("Network error".to_string()));
        let fail_result = sender.send(MockAudioCommand::StopRecording);
        assert!(fail_result.is_err(), "Send should fail in failure mode");
        assert!(fail_result.err().unwrap().contains("Network error"), "Should have custom error message");
        
        // Commands should not be sent during failure
        let commands_after_failure = sender.get_sent_commands();
        assert_eq!(commands_after_failure.len(), 1, "Failed commands should not be recorded");
        
        // Test recovery
        sender.set_failure(false, None);
        let recovery_result = sender.send(MockAudioCommand::StopPlayback);
        assert!(recovery_result.is_ok(), "Send should work after recovery");
        
        let final_commands = sender.get_sent_commands();
        assert_eq!(final_commands.len(), 2, "Should have two successful commands");
    }
}

#[cfg(test)]
mod audio_thread_tests {
    use super::*;

    #[test]
    #[serial]
    fn test_audio_thread_lifecycle() {
        let audio_thread = MockAudioThread::new();
        
        // Test initial state
        assert!(!audio_thread.is_thread_running(), "Thread should not be running initially");
        assert!(audio_thread.get_execution_results().is_empty(), "Should have no execution results");
        
        // Start thread
        let handle = audio_thread.start();
        assert!(audio_thread.is_thread_running(), "Thread should be running after start");
        
        // Send commands
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let file_path = temp_dir.path().join("test.wav");
        std::fs::write(&file_path, "fake audio data").expect("Failed to create test file");
        
        let send_result = audio_thread.send_command(
            MockAudioCommand::StartRecording { file_path: file_path.clone() }
        );
        assert!(send_result.is_ok(), "Command send should succeed");
        
        let playback_result = audio_thread.send_command(
            MockAudioCommand::StartPlayback { file_path: file_path.clone() }
        );
        assert!(playback_result.is_ok(), "Playback command should succeed");
        
        // Wait for commands to execute
        thread::sleep(Duration::from_millis(50));
        
        // Check execution results
        let results = audio_thread.get_execution_results();
        assert!(results.len() >= 1, "Should have execution results");
        
        let file_ops = audio_thread.get_file_operations();
        assert!(!file_ops.is_empty(), "Should have file operations logged");
        assert!(file_ops.iter().any(|op| op.contains("create_file")), "Should log file creation");
        
        // Stop thread
        audio_thread.stop();
        
        // Wait for thread to stop
        thread::sleep(Duration::from_millis(20));
        assert!(!audio_thread.is_thread_running(), "Thread should stop");
        
        // Join thread
        let join_result = handle.join();
        assert!(join_result.is_ok(), "Thread should join cleanly");
    }
    
    #[test]
    #[serial]
    fn test_audio_thread_error_handling() {
        let audio_thread = MockAudioThread::new();
        let _handle = audio_thread.start();
        
        // Test file not found scenario
        let nonexistent_file = PathBuf::from("/nonexistent/path/file.wav");
        let error_result = audio_thread.send_command(
            MockAudioCommand::StartPlayback { file_path: nonexistent_file }
        );
        assert!(error_result.is_ok(), "Command send should succeed even for bad file");
        
        // Wait for execution
        thread::sleep(Duration::from_millis(30));
        
        let results = audio_thread.get_execution_results();
        let failed_result = results.iter().find(|r| !r.success);
        assert!(failed_result.is_some(), "Should have failed execution result");
        
        if let Some(failure) = failed_result {
            assert!(failure.error_message.is_some(), "Should have error message");
            assert!(failure.error_message.as_ref().unwrap().contains("File not found"), 
                   "Should have appropriate error message");
        }
        
        audio_thread.stop();
    }
    
    #[test]
    #[serial]
    fn test_concurrent_command_sending() {
        let audio_thread = Arc::new(MockAudioThread::new());
        let _handle = audio_thread.start();
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        let num_senders = 5;
        let commands_per_sender = 10;
        
        let sender_handles: Vec<_> = (0..num_senders)
            .map(|sender_id| {
                let audio_thread = audio_thread.clone();
                let temp_path = temp_dir.path().to_path_buf();
                
                thread::spawn(move || {
                    for i in 0..commands_per_sender {
                        let file_path = temp_path.join(format!("sender_{}_file_{}.wav", sender_id, i));
                        let command = if i % 2 == 0 {
                            MockAudioCommand::StartRecording { file_path }
                        } else {
                            MockAudioCommand::StopRecording
                        };
                        
                        let _ = audio_thread.send_command(command);
                        thread::sleep(Duration::from_millis(1));
                    }
                })
            })
            .collect();
        
        // Wait for all senders to complete
        for handle in sender_handles {
            handle.join().expect("Sender thread should complete");
        }
        
        // Wait for command processing
        thread::sleep(Duration::from_millis(100));
        
        let results = audio_thread.get_execution_results();
        assert_eq!(results.len(), num_senders * commands_per_sender, 
                  "Should process all commands");
        
        audio_thread.stop();
    }
}

#[cfg(test)]
mod state_consistency_tests {
    use super::*;

    #[test]
    #[serial]
    fn test_recording_state_consistency() {
        // Test that recording state remains consistent across multiple operations
        let recording_state = Arc::new(Mutex::new(MockRecorderState::new()));
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        // Initialize state
        {
            let mut state = recording_state.lock().unwrap();
            state.initialize().expect("Initialization should succeed");
        }
        
        let num_cycles = 20;
        let cycle_handles: Vec<_> = (0..num_cycles)
            .map(|cycle| {
                let state = recording_state.clone();
                let file_path = temp_dir.path().join(format!("cycle_{}.wav", cycle));
                
                thread::spawn(move || {
                    let mut successful_starts = 0;
                    let mut successful_stops = 0;
                    
                    for _ in 0..5 {
                        // Try to start recording
                        {
                            let mut s = state.lock().unwrap();
                            if let Ok(()) = s.start_recording(file_path.clone()) {
                                successful_starts += 1;
                            }
                        }
                        
                        thread::sleep(Duration::from_millis(2));
                        
                        // Try to stop recording
                        {
                            let mut s = state.lock().unwrap();
                            if let Ok(()) = s.stop_recording() {
                                successful_stops += 1;
                            }
                        }
                        
                        thread::sleep(Duration::from_millis(1));
                    }
                    
                    (successful_starts, successful_stops)
                })
            })
            .collect();
        
        // Collect results
        let mut total_starts = 0;
        let mut total_stops = 0;
        
        for handle in cycle_handles {
            let (starts, stops) = handle.join().expect("Cycle thread should complete");
            total_starts += starts;
            total_stops += stops;
        }
        
        // Verify final state
        let final_state = recording_state.lock().unwrap();
        assert!(!final_state.is_recording, "Should not be recording at end");
        
        // In a properly synchronized system, starts should equal stops (or differ by at most 1)
        let difference = (total_starts as i32 - total_stops as i32).abs();
        assert!(difference <= 1, "Starts ({}) and stops ({}) should be nearly equal", 
               total_starts, total_stops);
    }
    
    #[test]
    #[serial]
    fn test_cross_component_state_synchronization() {
        // Test synchronization between different state components
        struct AppState {
            recording_state: MockRecorderState,
            is_in_meeting: bool,
            meeting_recordings: Vec<String>,
        }
        
        let app_state = Arc::new(Mutex::new(AppState {
            recording_state: MockRecorderState::new(),
            is_in_meeting: false,
            meeting_recordings: Vec::new(),
        }));
        
        // Initialize recording state
        {
            let mut state = app_state.lock().unwrap();
            state.recording_state.initialize().expect("Should initialize");
        }
        
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let num_operations = 15;
        
        let operation_handles: Vec<_> = (0..num_operations)
            .map(|i| {
                let state = app_state.clone();
                let file_path = temp_dir.path().join(format!("meeting_{}.wav", i));
                
                thread::spawn(move || {
                    // Simulate meeting detection and recording coordination
                    let mut state_guard = state.lock().unwrap();
                    
                    if !state_guard.is_in_meeting && !state_guard.recording_state.is_recording {
                        // Start meeting and recording together
                        state_guard.is_in_meeting = true;
                        if let Ok(()) = state_guard.recording_state.start_recording(file_path.clone()) {
                            state_guard.meeting_recordings.push(
                                file_path.file_name().unwrap().to_string_lossy().to_string()
                            );
                        }
                    }
                    
                    drop(state_guard);
                    
                    // Simulate some meeting activity
                    thread::sleep(Duration::from_millis(10));
                    
                    // Stop meeting and recording together
                    let mut state_guard = state.lock().unwrap();
                    if state_guard.is_in_meeting && state_guard.recording_state.is_recording {
                        let _ = state_guard.recording_state.stop_recording();
                        state_guard.is_in_meeting = false;
                    }
                })
            })
            .collect();
        
        // Wait for all operations to complete
        for handle in operation_handles {
            handle.join().expect("Operation thread should complete");
        }
        
        // Verify final consistency
        let final_state = app_state.lock().unwrap();
        assert!(!final_state.is_in_meeting, "Should not be in meeting at end");
        assert!(!final_state.recording_state.is_recording, "Should not be recording at end");
        
        // Meeting recordings should be tracked
        assert!(!final_state.meeting_recordings.is_empty(), 
               "Should have some meeting recordings tracked");
        
        // Each recording in the list should correspond to a successful recording session
        for recording_name in &final_state.meeting_recordings {
            assert!(recording_name.contains("meeting_"), "Recording names should be properly formatted");
            assert!(recording_name.ends_with(".wav"), "Recording names should have .wav extension");
        }
    }
    
    #[test]
    #[serial]
    fn test_state_recovery_after_errors() {
        let state = MockSharedState::new(MockRecorderState::new());
        
        // Initialize state
        state.write_state(|s| {
            s.initialize().expect("Should initialize");
        });
        
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let error_handles: Vec<_> = (0..5)
            .map(|i| {
                let state = state.clone();
                let file_path = temp_dir.path().join(format!("error_test_{}.wav", i));
                
                thread::spawn(move || {
                    // Simulate various error conditions
                    match i % 3 {
                        0 => {
                            // Try to start recording twice (should fail second time)
                            state.write_state(|s| {
                                let _ = s.start_recording(file_path.clone());
                                let second_attempt = s.start_recording(file_path);
                                assert!(second_attempt.is_err(), "Second start should fail");
                            });
                        },
                        1 => {
                            // Try to stop recording without starting
                            state.write_state(|s| {
                                let stop_result = s.stop_recording();
                                assert!(stop_result.is_err(), "Stop without start should fail");
                            });
                        },
                        2 => {
                            // Normal operation for comparison
                            state.write_state(|s| {
                                if let Ok(()) = s.start_recording(file_path) {
                                    thread::sleep(Duration::from_millis(5));
                                    let _ = s.stop_recording();
                                }
                            });
                        },
                        _ => unreachable!(),
                    }
                })
            })
            .collect();
        
        // Wait for all error scenarios to complete
        for handle in error_handles {
            handle.join().expect("Error handling thread should complete");
        }
        
        // Verify state is still consistent after errors
        let final_state_is_consistent = state.read_state(|s| {
            // State should be initialized and not recording
            s.is_initialized() && !s.is_recording
        });
        
        assert!(final_state_is_consistent, "State should remain consistent after errors");
        
        // Verify we can still perform normal operations
        let recovery_test = state.write_state(|s| {
            let file_path = temp_dir.path().join("recovery_test.wav");
            let start_result = s.start_recording(file_path);
            if start_result.is_ok() {
                let stop_result = s.stop_recording();
                stop_result.is_ok()
            } else {
                false
            }
        });
        
        assert!(recovery_test, "Should be able to perform normal operations after errors");
    }
}