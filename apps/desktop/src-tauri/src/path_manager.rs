use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::error::{AppError, Result};

/// Centralized path management for the desktop application.
/// Provides a single source of truth for all file and directory paths.
#[derive(Debug, Clone)]
pub struct AppPaths {
    recordings_dir: PathBuf,
    metadata_file: PathBuf,
}

impl AppPaths {
    /// Create a new AppPaths instance, initializing directories as needed.
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let app_data_dir = app_handle.path().app_data_dir()
            .map_err(|e| AppError::Path(format!("Failed to get app data directory: {}", e)))?;
        
        let recordings_dir = app_data_dir.join("recordings");
        
        // Ensure recordings directory exists
        std::fs::create_dir_all(&recordings_dir)
            .map_err(|e| AppError::Path(format!("Failed to create recordings directory: {}", e)))?;
        
        let metadata_file = recordings_dir.join("recordings.json");
        
        Ok(Self {
            recordings_dir,
            metadata_file,
        })
    }
    
    /// Get the recordings directory path.
    pub fn recordings_dir(&self) -> &PathBuf {
        &self.recordings_dir
    }
    
    /// Get the path to a specific recording file.
    pub fn recording_path(&self, filename: &str) -> PathBuf {
        self.recordings_dir.join(filename)
    }
    
    /// Get the metadata file path.
    pub fn metadata_file(&self) -> &PathBuf {
        &self.metadata_file
    }
}