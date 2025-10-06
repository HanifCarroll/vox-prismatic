use tauri::AppHandle;
use crate::app_config::AppConfig;

#[tauri::command]
pub async fn get_config(app_handle: AppHandle) -> Result<AppConfig, String> {
    AppConfig::load(&app_handle).await
}

#[tauri::command]
pub async fn update_config(
    app_handle: AppHandle,
    web_app_url: String,
    api_key: Option<String>
) -> Result<AppConfig, String> {
    let mut config = AppConfig::load(&app_handle).await.unwrap_or_default();
    
    config.web_app_url = web_app_url;
    config.api_key = api_key;
    
    config.save(&app_handle).await?;
    
    println!("Updated config - Web App URL: {}", config.web_app_url);
    if config.api_key.is_some() {
        println!("API key configured");
    }
    
    Ok(config)
}

#[tauri::command]
pub async fn reset_config(app_handle: AppHandle) -> Result<AppConfig, String> {
    let config = AppConfig::default();
    config.save(&app_handle).await?;
    
    println!("Reset config to defaults");
    Ok(config)
}