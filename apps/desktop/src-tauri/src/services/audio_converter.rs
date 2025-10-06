use std::path::{Path, PathBuf};
use std::fs;
use std::process::Command;
use tokio::task;
use tauri::Manager;
use crate::constants::*;

/// Audio conversion service for optimizing recorded audio files
pub struct AudioConverter;

impl AudioConverter {
    /// Convert WAV file to Opus format using bundled FFmpeg for efficient transcription
    /// 
    /// This function:
    /// 1. Uses bundled FFmpeg binary to convert WAV to OGG Opus format
    /// 2. Converts to mono and resamples to 16kHz 
    /// 3. Optimized for speech recognition with 64kbps bitrate
    /// 4. Creates standard OGG Opus file compatible with all players
    /// 5. Returns the new Opus file path
    pub async fn convert_wav_to_opus(wav_path: &Path, app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
        // Validate input file exists
        if !wav_path.exists() {
            return Err(format!("WAV file does not exist: {}", wav_path.display()));
        }

        // Create output path with .opus extension
        let opus_path = wav_path.with_extension("opus");

        println!("Converting {} to {}", wav_path.display(), opus_path.display());

        // Get bundled FFmpeg path (handle both development and production modes)
        let ffmpeg_name = if cfg!(target_os = "windows") {
            "ffmpeg-windows.exe"
        } else if cfg!(target_os = "macos") {
            "ffmpeg-macos"
        } else {
            "ffmpeg-linux"
        };
        
        // Try development mode path first (binaries/ subdirectory)
        let dev_path = std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|p| p.join("binaries").join(ffmpeg_name)));
            
        // Try production mode path (resource directory)
        let prod_path = app_handle.path().resource_dir()
            .ok()
            .map(|dir| dir.join(ffmpeg_name));
        
        // Debug: Log paths being checked
        if let Some(ref path) = dev_path {
            println!("Checking dev path: {} (exists: {})", path.display(), path.exists());
        }
        if let Some(ref path) = prod_path {
            println!("Checking prod path: {} (exists: {})", path.display(), path.exists());
        }
        
        // Find the first path that exists
        let ffmpeg_path = dev_path
            .clone()
            .filter(|p| p.exists())
            .or_else(|| prod_path.clone().filter(|p| p.exists()))
            .ok_or_else(|| {
                let dev_str = dev_path.map(|p| p.display().to_string()).unwrap_or_else(|| "unknown".to_string());
                let prod_str = prod_path.map(|p| p.display().to_string()).unwrap_or_else(|| "unknown".to_string());
                format!("FFmpeg binary not found. Tried dev: {}, prod: {}", dev_str, prod_str)
            })?;
        
        // Make executable on Unix systems
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = fs::metadata(&ffmpeg_path) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(&ffmpeg_path, perms);
            }
        }

        // Perform conversion using bundled FFmpeg
        let wav_path_owned = wav_path.to_owned();
        let opus_path_owned = opus_path.clone();
        let ffmpeg_path_owned = ffmpeg_path.clone();
        
        let result = task::spawn_blocking(move || {
            Self::convert_to_opus_ffmpeg(&wav_path_owned, &opus_path_owned, &ffmpeg_path_owned)
        }).await
        .map_err(|e| format!("Failed to spawn conversion task: {}", e))?;

        match result {
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

                // Get size reduction info for logging
                let original_size = fs::metadata(wav_path)
                    .map(|m| m.len())
                    .unwrap_or(0);
                
                let reduction = if original_size > 0 {
                    ((original_size - opus_size) as f64 / original_size as f64) * 100.0
                } else {
                    0.0
                };

                // Delete original WAV file to save space (Opus now handles both playback and transcription)
                if let Err(e) = fs::remove_file(wav_path) {
                    eprintln!("Warning: Failed to delete original WAV file: {}", e);
                    // Don't return error here - conversion succeeded, cleanup failed
                }

                println!("Successfully converted to Opus: {} bytes → {} bytes ({:.1}% reduction)", 
                        original_size, opus_size, reduction);
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

    /// Convert WAV to Opus using bundled FFmpeg
    fn convert_to_opus_ffmpeg(input_path: &Path, output_path: &Path, ffmpeg_path: &Path) -> Result<(), String> {
        println!("Using FFmpeg at: {}", ffmpeg_path.display());
        
        // Run FFmpeg to convert WAV to OGG Opus
        let output = Command::new(ffmpeg_path)
            .args([
                "-i", input_path.to_str().unwrap(),
                "-c:a", "libopus",           // Use Opus codec
                "-b:a", "64k",              // 64kbps bitrate for speech
                "-ar", AUDIO_SAMPLE_RATE_STR, // 16kHz sample rate
                "-ac", "1",                 // Mono (1 channel)
                "-y",                       // Overwrite output file
                output_path.to_str().unwrap()
            ])
            .output()
            .map_err(|e| format!("Failed to run FFmpeg: {}", e))?;
        
        if output.status.success() {
            println!("FFmpeg conversion completed successfully");
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("FFmpeg conversion failed: {}", stderr))
        }
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