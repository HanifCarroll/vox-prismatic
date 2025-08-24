use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;
use tokio::task;

/// Audio conversion service for optimizing recorded audio files
pub struct AudioConverter;

impl AudioConverter {
    /// Convert WAV file to Opus format for efficient transcription
    /// 
    /// This function:
    /// 1. Creates an Opus file path by changing the extension
    /// 2. Converts WAV to Opus using system FFmpeg
    /// 3. Deletes the original WAV file on successful conversion
    /// 4. Returns the new Opus file path
    pub async fn convert_wav_to_opus(wav_path: &Path) -> Result<PathBuf, String> {
        // Validate input file exists
        if !wav_path.exists() {
            return Err(format!("WAV file does not exist: {}", wav_path.display()));
        }

        // Create output path with .opus extension
        let opus_path = wav_path.with_extension("opus");

        println!("Converting {} to {}", wav_path.display(), opus_path.display());

        // Check if FFmpeg is available
        Self::check_ffmpeg_available().await?;

        // Perform conversion using system FFmpeg command
        match Self::ffmpeg_convert_to_opus(wav_path, &opus_path).await {
            Ok(_) => {
                // Verify the conversion was successful
                if !opus_path.exists() {
                    return Err("Opus file was not created successfully".to_string());
                }

                // Verify the Opus file has content
                let opus_size = fs::metadata(&opus_path)
                    .map_err(|e| format!("Failed to check Opus file size: {}", e))?
                    .len();

                if opus_size == 0 {
                    let _ = fs::remove_file(&opus_path);
                    return Err("Opus file was created but is empty".to_string());
                }

                // Delete original WAV file to save space
                if let Err(e) = fs::remove_file(wav_path) {
                    eprintln!("Warning: Failed to delete original WAV file: {}", e);
                    // Don't return error here - conversion succeeded, cleanup failed
                }

                println!("Successfully converted to Opus: {} ({} bytes)", 
                        opus_path.display(), opus_size);
                Ok(opus_path)
            }
            Err(e) => {
                // Clean up failed conversion attempt
                if opus_path.exists() {
                    let _ = fs::remove_file(&opus_path);
                }
                Err(e)
            }
        }
    }

    /// Check if FFmpeg is available on the system
    async fn check_ffmpeg_available() -> Result<(), String> {
        let output = task::spawn_blocking(|| {
            Command::new("ffmpeg")
                .arg("-version")
                .output()
        }).await
        .map_err(|e| format!("Failed to spawn FFmpeg check: {}", e))?
        .map_err(|e| format!("FFmpeg not found: {}. Please install FFmpeg to enable audio conversion.", e))?;

        if !output.status.success() {
            return Err("FFmpeg is installed but not working correctly".to_string());
        }

        Ok(())
    }

    /// Convert WAV to Opus using system FFmpeg command
    async fn ffmpeg_convert_to_opus(input_path: &Path, output_path: &Path) -> Result<(), String> {
        let input_str = input_path.to_string_lossy().to_string();
        let output_str = output_path.to_string_lossy().to_string();

        let output = task::spawn_blocking(move || {
            Command::new("ffmpeg")
                .arg("-i")
                .arg(&input_str)
                .arg("-c:a")                // Audio codec
                .arg("libopus")             // Use Opus codec
                .arg("-b:a")                // Audio bitrate
                .arg("64k")                 // 64kbps (good quality/size balance)
                .arg("-ar")                 // Sample rate
                .arg("16000")               // 16kHz (optimal for speech recognition)
                .arg("-ac")                 // Audio channels
                .arg("1")                   // Mono (sufficient for transcription)
                .arg("-application")        // Opus application type
                .arg("voip")                // Voice over IP mode (optimized for speech)
                .arg("-y")                  // Overwrite output files without asking
                .arg(&output_str)
                .output()
        }).await
        .map_err(|e| format!("Failed to spawn FFmpeg conversion: {}", e))?
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg conversion failed: {}", stderr));
        }

        // Log FFmpeg output for debugging
        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.is_empty() {
            println!("FFmpeg output: {}", stdout);
        }

        Ok(())
    }

    /// Get the file extension for converted audio files
    pub fn get_converted_extension() -> &'static str {
        "opus"
    }

    /// Check if a file is a converted audio file (has .opus extension)
    pub fn is_converted_file(path: &Path) -> bool {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("opus"))
            .unwrap_or(false)
    }

    /// Get file size reduction info for logging/debugging
    pub fn get_conversion_info(original_path: &Path, converted_path: &Path) -> Result<String, String> {
        let original_size = fs::metadata(original_path)
            .map_err(|e| format!("Failed to get original file size: {}", e))?
            .len();

        let converted_size = fs::metadata(converted_path)
            .map_err(|e| format!("Failed to get converted file size: {}", e))?
            .len();

        let reduction = if original_size > 0 {
            ((original_size - converted_size) as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };

        Ok(format!(
            "Original: {} bytes, Converted: {} bytes, Reduction: {:.1}%",
            original_size, converted_size, reduction
        ))
    }
}