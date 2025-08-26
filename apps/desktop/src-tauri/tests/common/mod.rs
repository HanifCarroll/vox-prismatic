/// Common test utilities for desktop app tests
/// 
/// This module provides shared utilities, mocks, and fixtures for testing
/// various components of the desktop application without hardware dependencies.

pub mod mocks;
pub mod fixtures;
pub mod meeting_mocks;
pub mod state_mocks;

use std::path::PathBuf;
use tempfile::TempDir;

/// Creates a temporary directory for testing file operations
/// Returns both the TempDir (must be kept alive) and the path
pub fn create_test_dir() -> (TempDir, PathBuf) {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let path = temp_dir.path().to_path_buf();
    (temp_dir, path)
}

/// Creates a temporary file with given content
/// Returns the file path
pub fn create_test_file(dir: &std::path::Path, filename: &str, content: &str) -> PathBuf {
    let file_path = dir.join(filename);
    std::fs::write(&file_path, content).expect("Failed to write test file");
    file_path
}

/// Helper for asserting that a path exists and is readable
pub fn assert_path_exists_and_readable(path: &std::path::Path) {
    assert!(path.exists(), "Path should exist: {}", path.display());
    assert!(path.is_file() || path.is_dir(), "Path should be file or directory: {}", path.display());
    
    // Try to read metadata to ensure it's accessible
    std::fs::metadata(path)
        .unwrap_or_else(|e| panic!("Path should be readable {}: {}", path.display(), e));
}