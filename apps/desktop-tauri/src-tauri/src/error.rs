/// Comprehensive error handling for the desktop application.
/// Provides structured error types instead of string-based errors for better debugging.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Audio system error: {0}")]
    Audio(String),
    
    #[error("Configuration error: {0}")]
    Config(String),
    
    #[error("Transcription error: {0}")]
    Transcription(String),
    
    #[error("Meeting detection error: {0}")]
    MeetingDetection(String),
    
    #[error("Path error: {0}")]
    Path(String),
    
    #[error("Recording error: {0}")]
    Recording(String),
    
    #[error("Playback error: {0}")]
    Playback(String),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("HTTP request error: {0}")]
    Http(#[from] reqwest::Error),
    
    #[error("File conversion error: {0}")]
    Conversion(String),
    
    #[error("System error: {0}")]
    System(String),
}

// Implement From<String> for AppError to support legacy string errors
impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::System(s)
    }
}

impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError::System(s.to_string())
    }
}

/// Convenience type alias for Results using AppError
pub type Result<T> = std::result::Result<T, AppError>;

