use reqwest;
use serde::{Serialize, Deserialize};
use std::path::Path;
use tokio_util::codec::{BytesCodec, FramedRead};
use tokio::fs::File;
use crate::constants::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub transcript: String,
    pub confidence: Option<f64>,
    pub processing_time: Option<f64>,
    pub word_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionError {
    pub error: String,
    pub details: Option<String>,
}

/// Service for streaming audio files to Next.js API for Deepgram transcription
pub struct TranscriptionService;

impl TranscriptionService {
    /// Stream audio file directly to Next.js API without loading into memory
    /// 
    /// This function:
    /// 1. Opens the Opus audio file as a stream
    /// 2. Creates multipart form data with the audio stream
    /// 3. Streams to your Next.js transcription endpoint
    /// 4. Returns success/error status (transcription data stays on server)
    pub async fn transcribe_audio_stream(
        file_path: &Path,
        api_url: &str, 
        api_key: Option<&str>
    ) -> Result<TranscriptionResponse, String> {
        println!("Starting streaming transcription for file: {}", file_path.display());
        
        // Validate file exists
        if !file_path.exists() {
            return Err(format!("Audio file does not exist: {}", file_path.display()));
        }

        let file_size = std::fs::metadata(file_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?
            .len();
            
        println!("Streaming audio file: {} bytes", file_size);

        // Get filename for the request
        let file_name = file_path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("recording.opus")
            .to_string();

        // Open file for streaming
        let file = File::open(file_path).await
            .map_err(|e| format!("Failed to open audio file: {}", e))?;
        
        // Create async stream from file
        let stream = FramedRead::new(file, BytesCodec::new());
        let file_body = reqwest::Body::wrap_stream(stream);

        // Create HTTP client
        let client = reqwest::Client::new();

        // Create multipart form with streaming file
        let form = reqwest::multipart::Form::new()
            .part(
                "audio",
                reqwest::multipart::Part::stream(file_body)
                    .file_name(file_name.clone())
                    .mime_str("audio/opus")
                    .map_err(|e| format!("Failed to set MIME type: {}", e))?
            )
            .text("format", "opus")
            .text("sample_rate", AUDIO_SAMPLE_RATE_STR)
            .text("channels", "1");

        // Build request
        let mut request_builder = client
            .post(api_url)
            .multipart(form);

        // Add API key if provided
        if let Some(key) = api_key {
            request_builder = request_builder.header("Authorization", format!("Bearer {}", key));
        }

        println!("Sending streaming transcription request to: {}", api_url);
        println!("File: {} ({} bytes)", file_name, file_size);

        // Send request
        let response = request_builder
            .send()
            .await
            .map_err(|e| format!("Failed to send streaming transcription request: {}", e))?;

        let status = response.status();
        println!("Streaming transcription API response status: {}", status);

        if status.is_success() {
            // Parse successful response
            let transcription: TranscriptionResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse transcription response: {}", e))?;
                
            println!("Streaming transcription completed successfully: {} words", 
                    transcription.word_count.unwrap_or(0));
            Ok(transcription)
        } else {
            // Handle error response
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| format!("HTTP {}", status));
                
            Err(format!("Streaming transcription failed with status {}: {}", status, error_text))
        }
    }
}