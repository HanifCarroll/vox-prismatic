/// Mock implementations for Tauri components
/// 
/// These mocks allow testing business logic without requiring a full Tauri runtime
/// or hardware dependencies like audio systems.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use mockall::predicate::*;
use mockall::mock;
use tempfile::TempDir;

/// Mock Tauri AppHandle for testing
/// 
/// This provides a simplified version of Tauri's AppHandle that can be used
/// in unit tests without requiring the full Tauri runtime.
pub struct MockAppHandle {
    pub temp_dir: TempDir,
    pub app_data_path: PathBuf,
}

impl MockAppHandle {
    pub fn new() -> Self {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let app_data_path = temp_dir.path().join("app_data");
        std::fs::create_dir_all(&app_data_path).expect("Failed to create app data directory");
        
        Self {
            temp_dir,
            app_data_path,
        }
    }
    
    /// Simulates Tauri's path().app_data_dir() method
    pub fn app_data_dir(&self) -> Result<PathBuf, String> {
        Ok(self.app_data_path.clone())
    }
    
    /// Creates a recordings subdirectory for testing
    pub fn create_recordings_dir(&self) -> Result<PathBuf, String> {
        let recordings_dir = self.app_data_path.join("recordings");
        std::fs::create_dir_all(&recordings_dir)
            .map_err(|e| format!("Failed to create recordings directory: {}", e))?;
        Ok(recordings_dir)
    }
}

/// Mock trait for testing components that depend on external processes
#[cfg(test)]
mock! {
    pub ProcessRunner {
        fn run_command(&self, command: &str, args: &[&str]) -> Result<String, String>;
        fn check_process_running(&self, process_name: &str) -> bool;
    }
}

/// Mock for testing audio system commands without actual audio hardware
#[derive(Debug, Clone)]
pub struct MockAudioSystem {
    pub recording_active: Arc<Mutex<bool>>,
    pub playback_active: Arc<Mutex<bool>>,
    pub last_command: Arc<Mutex<Option<String>>>,
}

impl MockAudioSystem {
    pub fn new() -> Self {
        Self {
            recording_active: Arc::new(Mutex::new(false)),
            playback_active: Arc::new(Mutex::new(false)),
            last_command: Arc::new(Mutex::new(None)),
        }
    }
    
    pub fn simulate_start_recording(&self) {
        *self.recording_active.lock().unwrap() = true;
        *self.last_command.lock().unwrap() = Some("start_recording".to_string());
    }
    
    pub fn simulate_stop_recording(&self) {
        *self.recording_active.lock().unwrap() = false;
        *self.last_command.lock().unwrap() = Some("stop_recording".to_string());
    }
    
    pub fn is_recording(&self) -> bool {
        *self.recording_active.lock().unwrap()
    }
    
    pub fn get_last_command(&self) -> Option<String> {
        self.last_command.lock().unwrap().clone()
    }
}

impl Default for MockAudioSystem {
    fn default() -> Self {
        Self::new()
    }
}