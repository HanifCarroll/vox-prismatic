use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub web_app_url: String,
    pub api_key: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            web_app_url: "http://localhost:3000".to_string(),
            api_key: None,
        }
    }
}

impl AppConfig {
    /// Get the transcription API endpoint URL
    pub fn transcribe_endpoint(&self) -> String {
        format!("{}/api/transcribe", self.web_app_url.trim_end_matches('/'))
    }
    
    /// Load config from app data directory or create default
    pub async fn load(app_handle: &AppHandle) -> Result<Self, String> {
        let config_path = Self::get_config_path(app_handle)?;
        
        if config_path.exists() {
            let config_content = tokio::fs::read_to_string(&config_path).await
                .map_err(|e| format!("Failed to read config file: {}", e))?;
            
            serde_json::from_str(&config_content)
                .map_err(|e| format!("Failed to parse config file: {}", e))
        } else {
            // Create default config
            let default_config = Self::default();
            default_config.save(app_handle).await?;
            Ok(default_config)
        }
    }
    
    /// Save config to app data directory
    pub async fn save(&self, app_handle: &AppHandle) -> Result<(), String> {
        let config_path = Self::get_config_path(app_handle)?;
        
        // Ensure parent directory exists
        if let Some(parent) = config_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
        
        let config_content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
        tokio::fs::write(&config_path, config_content).await
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        
        println!("Config saved to: {}", config_path.display());
        Ok(())
    }
    
    /// Get the config file path
    fn get_config_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
        let app_data_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;
        
        Ok(app_data_dir.join("config.json"))
    }
}