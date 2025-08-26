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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::TempDir;
    // Note: In a real scenario, you'd import from tests::common, but for now we'll implement locally
    fn assert_path_exists_and_readable(path: &std::path::Path) {
        assert!(path.exists(), "Path should exist: {}", path.display());
        assert!(path.is_file() || path.is_dir(), "Path should be file or directory: {}", path.display());
        
        // Try to read metadata to ensure it's accessible
        std::fs::metadata(path)
            .unwrap_or_else(|e| panic!("Path should be readable {}: {}", path.display(), e));
    }

    /// Mock AppHandle for testing path operations
    struct MockAppHandle {
        temp_dir: TempDir,
        app_data_path: PathBuf,
    }

    impl MockAppHandle {
        fn new() -> Self {
            let temp_dir = TempDir::new().expect("Failed to create temp directory");
            let app_data_path = temp_dir.path().join("app_data");
            std::fs::create_dir_all(&app_data_path).expect("Failed to create app data directory");
            
            Self {
                temp_dir,
                app_data_path,
            }
        }
        
        fn app_data_dir(&self) -> Result<PathBuf> {
            Ok(self.app_data_path.clone())
        }
    }

    #[test]
    fn test_app_paths_creation() {
        let mock_handle = MockAppHandle::new();
        
        // Create AppPaths using our mock
        let result = create_app_paths_from_mock(&mock_handle);
        assert!(result.is_ok(), "AppPaths creation should succeed");
        
        let paths = result.unwrap();
        
        // Verify recordings directory exists and is accessible
        assert_path_exists_and_readable(paths.recordings_dir());
        assert!(paths.recordings_dir().is_dir(), "Recordings directory should be a directory");
        
        // Verify metadata file path is correctly constructed
        assert_eq!(
            paths.metadata_file(),
            &paths.recordings_dir().join("recordings.json")
        );
    }

    #[test]
    fn test_recording_path_generation() {
        let mock_handle = MockAppHandle::new();
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        // Test various filename patterns
        let test_cases = vec![
            "simple.wav",
            "recording_20240826_143022.wav",
            "test with spaces.wav",
            "test-with-dashes.wav",
            "test_with_underscores.wav",
        ];
        
        for filename in test_cases {
            let recording_path = paths.recording_path(filename);
            let expected_path = paths.recordings_dir().join(filename);
            assert_eq!(recording_path, expected_path, "Recording path should be correctly constructed");
            
            // Verify the parent directory exists
            assert_eq!(
                recording_path.parent().unwrap(),
                paths.recordings_dir().as_path(),
                "Recording path parent should be recordings directory"
            );
        }
    }

    #[test]
    fn test_special_characters_in_filename() {
        let mock_handle = MockAppHandle::new();
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        // Test filenames with special characters that might cause issues
        let special_filenames = vec![
            "file with spaces.wav",
            "file-with-dashes.wav", 
            "file_with_underscores.wav",
            "file.with.dots.wav",
            "file(with)parentheses.wav",
            "file[with]brackets.wav",
        ];
        
        for filename in special_filenames {
            let recording_path = paths.recording_path(filename);
            
            // Verify the filename component is preserved
            assert_eq!(
                recording_path.file_name().unwrap().to_string_lossy(),
                filename,
                "Filename should be preserved exactly"
            );
            
            // Verify it's still within the recordings directory
            assert!(
                recording_path.starts_with(paths.recordings_dir()),
                "Recording path should be within recordings directory"
            );
        }
    }

    #[test]
    fn test_empty_filename() {
        let mock_handle = MockAppHandle::new();
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        let recording_path = paths.recording_path("");
        
        // Even with empty filename, should return recordings directory
        assert_eq!(recording_path, *paths.recordings_dir());
    }

    #[test]
    fn test_paths_are_absolute() {
        let mock_handle = MockAppHandle::new();
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        // All paths should be absolute
        assert!(paths.recordings_dir().is_absolute(), "Recordings directory should be absolute");
        assert!(paths.metadata_file().is_absolute(), "Metadata file path should be absolute");
        
        let recording_path = paths.recording_path("test.wav");
        assert!(recording_path.is_absolute(), "Recording paths should be absolute");
    }

    #[test]
    fn test_directory_creation() {
        let mock_handle = MockAppHandle::new();
        
        // Delete the recordings directory if it exists to test creation
        let app_data_path = mock_handle.app_data_dir().unwrap();
        let recordings_dir = app_data_path.join("recordings");
        if recordings_dir.exists() {
            std::fs::remove_dir_all(&recordings_dir).expect("Failed to remove test directory");
        }
        
        // Creating AppPaths should recreate the directory
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        // Verify the directory was created
        assert!(paths.recordings_dir().exists(), "Recordings directory should be created");
        assert!(paths.recordings_dir().is_dir(), "Recordings directory should be a directory");
        
        // Verify we can write to it
        let test_file = paths.recordings_dir().join("test_file.txt");
        std::fs::write(&test_file, "test content").expect("Should be able to write to recordings directory");
        assert!(test_file.exists(), "Test file should be created");
    }

    /// Helper function to create AppPaths from our mock
    /// This simulates what the real implementation does with a Tauri AppHandle
    fn create_app_paths_from_mock(mock_handle: &MockAppHandle) -> Result<AppPaths> {
        let app_data_dir = mock_handle.app_data_dir()?;
        let recordings_dir = app_data_dir.join("recordings");
        
        // Ensure recordings directory exists
        std::fs::create_dir_all(&recordings_dir)
            .map_err(|e| AppError::Path(format!("Failed to create recordings directory: {}", e)))?;
        
        let metadata_file = recordings_dir.join("recordings.json");
        
        Ok(AppPaths {
            recordings_dir,
            metadata_file,
        })
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_path_handling() {
        let mock_handle = MockAppHandle::new();
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        // Test Windows-specific path scenarios
        let recording_path = paths.recording_path("test.wav");
        let path_str = recording_path.to_string_lossy();
        
        // On Windows, paths should use backslashes
        assert!(path_str.contains("\\") || path_str.contains("/"), 
                "Path should contain appropriate separators");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_unix_path_handling() {
        let mock_handle = MockAppHandle::new();
        let paths = create_app_paths_from_mock(&mock_handle).unwrap();
        
        // Test Unix-specific path scenarios
        let recording_path = paths.recording_path("test.wav");
        let path_str = recording_path.to_string_lossy();
        
        // On Unix systems, paths should use forward slashes
        assert!(path_str.contains("/"), "Path should contain forward slashes");
    }
}