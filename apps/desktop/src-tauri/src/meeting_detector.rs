use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use crate::constants::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MeetingApp {
    Zoom,
    SlackHuddle,
    GoogleMeet,
    MicrosoftTeams,
    Discord,
    Unknown(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetingState {
    pub is_in_meeting: bool,
    pub detected_app: Option<MeetingApp>,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug)]
pub struct MeetingDetector {
    state: Arc<Mutex<MeetingState>>,
    monitoring: Arc<Mutex<bool>>,
}

impl MeetingDetector {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(MeetingState {
                is_in_meeting: false,
                detected_app: None,
                started_at: None,
            })),
            monitoring: Arc::new(Mutex::new(false)),
        }
    }

    pub fn start_monitoring(&self) -> Result<(), String> {
        let mut monitoring = self.monitoring.lock().unwrap();
        if *monitoring {
            return Err("Already monitoring".to_string());
        }
        *monitoring = true;

        let state = self.state.clone();
        let monitoring_flag = self.monitoring.clone();

        thread::spawn(move || {
            while *monitoring_flag.lock().unwrap() {
                let meeting_detected = detect_meeting_apps();
                
                let mut current_state = state.lock().unwrap();
                
                if let Some(app) = meeting_detected {
                    if !current_state.is_in_meeting {
                        // Meeting just started
                        current_state.is_in_meeting = true;
                        current_state.detected_app = Some(app.clone());
                        current_state.started_at = Some(chrono::Utc::now());
                        println!("Meeting detected: {:?}", app);
                    }
                } else {
                    if current_state.is_in_meeting {
                        // Meeting just ended
                        current_state.is_in_meeting = false;
                        current_state.detected_app = None;
                        current_state.started_at = None;
                        println!("Meeting ended");
                    }
                }
                
                drop(current_state);
                thread::sleep(Duration::from_secs(5)); // Check every 5 seconds
            }
        });

        Ok(())
    }

    pub fn stop_monitoring(&self) {
        let mut monitoring = self.monitoring.lock().unwrap();
        *monitoring = false;
    }

    pub fn get_state(&self) -> MeetingState {
        self.state.lock().unwrap().clone()
    }
}

// Platform-specific meeting detection
#[cfg(target_os = "macos")]
fn detect_meeting_apps() -> Option<MeetingApp> {
    // Checking for meeting apps...
    
    // Method 1: Check for known meeting app processes
    if let Some(app) = check_running_processes() {
        println!("Meeting detected via process: {:?}", app);
        return Some(app);
    }

    // Method 2: Check browser tabs for meeting URLs (prioritize this for web meetings)
    if let Some(app) = check_browser_meeting_urls() {
        println!("Meeting detected via browser: {:?}", app);
        return Some(app);
    }

    // Method 3: Check for microphone usage by specific apps
    if let Some(app) = check_microphone_usage() {
        println!("Meeting detected via microphone: {:?}", app);
        return Some(app);
    }

    None
}

#[cfg(target_os = "macos")]
fn check_running_processes() -> Option<MeetingApp> {
    // Use ps command to list processes
    let output = Command::new("ps")
        .args(&["aux"])
        .output()
        .ok()?;

    let processes = String::from_utf8_lossy(&output.stdout);
    
    // Check for Zoom
    if processes.contains("zoom.us") || processes.contains("CptHost") {
        // Additional check: Zoom creates specific processes during meetings
        if processes.contains("CptHost") || check_zoom_meeting_window() {
            return Some(MeetingApp::Zoom);
        }
    }

    // Check for Slack (Huddle detection is trickier)
    if processes.contains("Slack") && check_slack_huddle_active() {
        return Some(MeetingApp::SlackHuddle);
    }

    // Check for Microsoft Teams
    if processes.contains("Microsoft Teams") && check_teams_call_active() {
        return Some(MeetingApp::MicrosoftTeams);
    }

    // Check for Discord
    if processes.contains("Discord") && check_discord_voice_active() {
        return Some(MeetingApp::Discord);
    }

    None
}

#[cfg(target_os = "macos")]
fn check_microphone_usage() -> Option<MeetingApp> {
    // Use system_profiler to check audio input
    let output = Command::new("system_profiler")
        .args(&["SPAudioDataType", "-json"])
        .output()
        .ok()?;

    let audio_info = String::from_utf8_lossy(&output.stdout);
    
    // Parse JSON and check for active audio sessions
    // This is a simplified version - you'd need proper JSON parsing
    if audio_info.contains("zoom") {
        return Some(MeetingApp::Zoom);
    }
    
    None
}

#[cfg(target_os = "macos")]
fn check_browser_meeting_urls() -> Option<MeetingApp> {
    // Checking browser URLs...
    
    // Check Chrome specifically first (most common for Google Meet)
    if let Some(app) = check_chrome_urls() {
        return Some(app);
    }
    
    // Check Dia browser (Chromium-based)
    if let Some(app) = check_dia_urls() {
        return Some(app);
    }
    
    // Check Safari
    if let Some(app) = check_safari_urls() {
        return Some(app);
    }
    
    None
}

#[cfg(target_os = "macos")]
fn check_chrome_urls() -> Option<MeetingApp> {
    let script = r#"
        tell application "System Events"
            if exists (processes where name is "Google Chrome") then
                tell application "Google Chrome"
                    set allUrls to ""
                    repeat with w in windows
                        repeat with t in tabs of w
                            set allUrls to allUrls & (URL of t) & " "
                        end repeat
                    end repeat
                    return allUrls
                end tell
            end if
        end tell
        return ""
    "#;

    let output = Command::new("osascript")
        .args(&["-e", script])
        .output()
        .ok()?;

    let urls = String::from_utf8_lossy(&output.stdout);
    // Chrome URLs found: {urls}
    
    // Check for Google Meet - only actual meeting rooms, not landing pages  
    if is_google_meet_room(&urls) {
        println!("Google Meet detected in Chrome");
        return Some(MeetingApp::GoogleMeet);
    }
    if urls.contains("zoom.us/j/") || urls.contains("zoom.us/wc/") {
        println!("Zoom meeting detected in Chrome");
        return Some(MeetingApp::Zoom);
    }
    if urls.contains("teams.microsoft.com/l/meetup-join") || urls.contains("teams.live.com") {
        println!("Found Teams URL in Chrome");
        return Some(MeetingApp::MicrosoftTeams);
    }
    if urls.contains("app.slack.com") && (urls.contains("/huddle/") || urls.contains("huddle")) {
        println!("Found Slack Huddle URL in Chrome");
        return Some(MeetingApp::SlackHuddle);
    }

    None
}

#[cfg(target_os = "macos")]
fn check_dia_urls() -> Option<MeetingApp> {
    // Dia browser doesn't support AppleScript tab access like Chrome/Safari
    // Instead, we'll use network process detection or window title checking
    // as alternative methods
    
    // Dia URLs: AppleScript not supported
    
    // Alternative approach for Dia browser:
    // Only use microphone detection (more reliable than network activity)
    if check_dia_microphone_usage() {
        println!("Detected potential meeting in Dia browser via microphone usage");
        return Some(MeetingApp::Unknown("Meeting detected in Dia browser".to_string()));
    }
    
    None
}

#[cfg(target_os = "macos")]
fn check_dia_microphone_usage() -> bool {
    // Check if Dia browser process is using the microphone
    let output = Command::new("lsof")
        .args(&["-c", "Dia"])
        .output();
    
    if let Ok(output) = output {
        let lsof_result = String::from_utf8_lossy(&output.stdout);
        // Look for audio device access patterns
        if lsof_result.contains("/dev/") && 
           (lsof_result.contains("audio") || 
            lsof_result.contains("mic") ||
            lsof_result.contains("sound")) {
            println!("Dia browser appears to be accessing audio devices");
            return true;
        }
    }
    
    false
}

#[cfg(target_os = "macos")]
fn check_safari_urls() -> Option<MeetingApp> {
    let script = r#"
        tell application "System Events"
            if exists (processes where name is "Safari") then
                tell application "Safari"
                    set allUrls to ""
                    repeat with w in windows
                        repeat with t in tabs of w
                            set allUrls to allUrls & (URL of t) & " "
                        end repeat
                    end repeat
                    return allUrls
                end tell
            end if
        end tell
        return ""
    "#;

    let output = Command::new("osascript")
        .args(&["-e", script])
        .output()
        .ok()?;

    let urls = String::from_utf8_lossy(&output.stdout);
    // Safari URLs checked
    
    // Check for Google Meet - only actual meeting rooms, not landing pages  
    if is_google_meet_room(&urls) {
        println!("Found Google Meet room URL in Safari");
        return Some(MeetingApp::GoogleMeet);
    }
    if urls.contains("zoom.us/j/") || urls.contains("zoom.us/wc/") {
        println!("Found Zoom URL in Safari");
        return Some(MeetingApp::Zoom);
    }
    if urls.contains("teams.microsoft.com/l/meetup-join") || urls.contains("teams.live.com") {
        println!("Found Teams URL in Safari");
        return Some(MeetingApp::MicrosoftTeams);
    }
    if urls.contains("app.slack.com") && (urls.contains("/huddle/") || urls.contains("huddle")) {
        println!("Found Slack Huddle URL in Safari");
        return Some(MeetingApp::SlackHuddle);
    }

    None
}

// Specific app detection helpers
#[cfg(target_os = "macos")]
fn check_zoom_meeting_window() -> bool {
    // Check if Zoom has an active meeting window
    let script = r#"
        tell application "System Events"
            if application "zoom.us" is running then
                tell application process "zoom.us"
                    return count of windows > 1
                end tell
            end if
        end tell
        return false
    "#;

    Command::new("osascript")
        .args(&["-e", script])
        .output()
        .map(|output| {
            String::from_utf8_lossy(&output.stdout).contains("true")
        })
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn check_slack_huddle_active() -> bool {
    // Check Slack window title for huddle indicator
    let script = r#"
        tell application "System Events"
            if application "Slack" is running then
                tell application process "Slack"
                    set windowTitles to title of windows
                    return windowTitles as string
                end tell
            end if
        end tell
        return ""
    "#;

    Command::new("osascript")
        .args(&["-e", script])
        .output()
        .map(|output| {
            let titles = String::from_utf8_lossy(&output.stdout);
            titles.contains("huddle") || titles.contains("Huddle")
        })
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn check_teams_call_active() -> bool {
    // Check for Teams call window
    let script = r#"
        tell application "System Events"
            if application "Microsoft Teams" is running then
                tell application process "Microsoft Teams"
                    set windowCount to count of windows
                    return windowCount > 1
                end tell
            end if
        end tell
        return false
    "#;

    Command::new("osascript")
        .args(&["-e", script])
        .output()
        .map(|output| {
            String::from_utf8_lossy(&output.stdout).contains("true")
        })
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn check_discord_voice_active() -> bool {
    // Discord shows voice connection in window title
    let script = r#"
        tell application "System Events"
            if application "Discord" is running then
                tell application process "Discord"
                    set windowTitles to title of windows
                    return windowTitles as string
                end tell
            end if
        end tell
        return ""
    "#;

    Command::new("osascript")
        .args(&["-e", script])
        .output()
        .map(|output| {
            let titles = String::from_utf8_lossy(&output.stdout);
            titles.contains("Voice Connected") || titles.contains("Screen Share")
        })
        .unwrap_or(false)
}

// Helper function to detect actual Google Meet rooms vs landing pages
fn is_google_meet_room(urls: &str) -> bool {
    if !urls.contains("meet.google.com/") {
        return false;
    }
    
    // Exclude landing pages and general pages
    if urls.contains("meet.google.com/landing") || 
       urls.contains("meet.google.com/_meet") ||
       urls.contains("meet.google.com/?") ||
       urls.ends_with("meet.google.com/") {
        return false;
    }
    
    // Check for actual meeting room patterns:
    // meet.google.com/abc-def-ghi (3 segments separated by dashes)
    // meet.google.com/lookup/xxx (lookup URLs)
    // meet.google.com/xxx-xxx-xxx?params (with parameters)
    
    // Use regex-like pattern matching
    for line in urls.lines() {
        if line.contains("meet.google.com/") {
            // Extract the part after meet.google.com/
            if let Some(start) = line.find("meet.google.com/") {
                let after_domain = &line[start + 16..]; // "meet.google.com/".len() = 16
                
                // Check for room code patterns (3 groups of letters/numbers separated by dashes)
                if after_domain.contains('-') && 
                   after_domain.chars().take(MEETING_URL_MAX_CHARS).filter(|&c| c == '-').count() >= MEETING_URL_MIN_DASHES {
                    println!("Detected meeting room pattern: {}", after_domain);
                    return true;
                }
                
                // Check for lookup URLs
                if after_domain.starts_with("lookup/") {
                    println!("Detected lookup meeting URL: {}", after_domain);
                    return true;
                }
            }
        }
    }
    
    false
}

// Fallback for non-macOS platforms
#[cfg(not(target_os = "macos"))]
fn detect_meeting_apps() -> Option<MeetingApp> {
    None
}