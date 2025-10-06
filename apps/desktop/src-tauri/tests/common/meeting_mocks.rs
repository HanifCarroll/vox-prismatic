/// Mock infrastructure for testing MeetingDetector without system dependencies
/// 
/// These mocks allow testing meeting detection logic without requiring actual browsers,
/// processes, or system calls, enabling deterministic and fast test execution.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use mockall::predicate::*;
use mockall::mock;

/// Mock for browser URL detection that simulates AppleScript calls
#[derive(Debug, Clone)]
pub struct MockBrowserChecker {
    /// Simulated browser tabs: browser_name -> vec of URLs
    pub browser_tabs: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// Whether browser processes are "running"
    pub running_browsers: Arc<Mutex<Vec<String>>>,
    /// Simulate AppleScript failures
    pub should_fail_applescript: Arc<Mutex<bool>>,
}

impl MockBrowserChecker {
    pub fn new() -> Self {
        Self {
            browser_tabs: Arc::new(Mutex::new(HashMap::new())),
            running_browsers: Arc::new(Mutex::new(vec!["Google Chrome".to_string()])),
            should_fail_applescript: Arc::new(Mutex::new(false)),
        }
    }
    
    /// Set tabs for a specific browser
    pub fn set_browser_tabs(&self, browser: &str, urls: Vec<String>) {
        let mut tabs = self.browser_tabs.lock().unwrap();
        tabs.insert(browser.to_string(), urls);
    }
    
    /// Add a single URL to a browser
    pub fn add_browser_url(&self, browser: &str, url: String) {
        let mut tabs = self.browser_tabs.lock().unwrap();
        tabs.entry(browser.to_string()).or_insert_with(Vec::new).push(url);
    }
    
    /// Set which browsers are "running"
    pub fn set_running_browsers(&self, browsers: Vec<String>) {
        let mut running = self.running_browsers.lock().unwrap();
        *running = browsers;
    }
    
    /// Simulate AppleScript failure
    pub fn set_applescript_failure(&self, should_fail: bool) {
        let mut fail = self.should_fail_applescript.lock().unwrap();
        *fail = should_fail;
    }
    
    /// Get URLs for a browser (simulates AppleScript output)
    pub fn get_browser_urls(&self, browser: &str) -> Option<String> {
        if *self.should_fail_applescript.lock().unwrap() {
            return None;
        }
        
        let running = self.running_browsers.lock().unwrap();
        if !running.contains(&browser.to_string()) {
            return None;
        }
        
        let tabs = self.browser_tabs.lock().unwrap();
        tabs.get(browser).map(|urls| urls.join(" "))
    }
    
    /// Clear all browser data
    pub fn clear(&self) {
        self.browser_tabs.lock().unwrap().clear();
        self.running_browsers.lock().unwrap().clear();
        *self.should_fail_applescript.lock().unwrap() = false;
    }
}

impl Default for MockBrowserChecker {
    fn default() -> Self {
        Self::new()
    }
}

/// Mock for system process detection
#[derive(Debug, Clone)]
pub struct MockProcessChecker {
    /// Simulated running processes: process_name -> is_running
    pub running_processes: Arc<Mutex<HashMap<String, bool>>>,
    /// Simulated process output (for ps aux command)
    pub process_output: Arc<Mutex<String>>,
    /// Whether process commands should fail
    pub should_fail_commands: Arc<Mutex<bool>>,
}

impl MockProcessChecker {
    pub fn new() -> Self {
        Self {
            running_processes: Arc::new(Mutex::new(HashMap::new())),
            process_output: Arc::new(Mutex::new(String::new())),
            should_fail_commands: Arc::new(Mutex::new(false)),
        }
    }
    
    /// Set whether a process is running
    pub fn set_process_running(&self, process_name: &str, is_running: bool) {
        let mut processes = self.running_processes.lock().unwrap();
        processes.insert(process_name.to_string(), is_running);
    }
    
    /// Set the simulated output of ps aux command
    pub fn set_process_output(&self, output: String) {
        let mut ps_output = self.process_output.lock().unwrap();
        *ps_output = output;
    }
    
    /// Set command failure simulation
    pub fn set_command_failure(&self, should_fail: bool) {
        let mut fail = self.should_fail_commands.lock().unwrap();
        *fail = should_fail;
    }
    
    /// Check if process is running
    pub fn is_process_running(&self, process_name: &str) -> Option<bool> {
        if *self.should_fail_commands.lock().unwrap() {
            return None;
        }
        
        let processes = self.running_processes.lock().unwrap();
        processes.get(process_name).copied()
    }
    
    /// Get process output
    pub fn get_process_output(&self) -> Option<String> {
        if *self.should_fail_commands.lock().unwrap() {
            return None;
        }
        
        Some(self.process_output.lock().unwrap().clone())
    }
    
    /// Clear all process data
    pub fn clear(&self) {
        self.running_processes.lock().unwrap().clear();
        *self.process_output.lock().unwrap() = String::new();
        *self.should_fail_commands.lock().unwrap() = false;
    }
}

impl Default for MockProcessChecker {
    fn default() -> Self {
        Self::new()
    }
}

/// Mock for system-level detection (microphone, audio devices)
#[derive(Debug, Clone)]
pub struct MockSystemDetector {
    /// Simulated microphone usage by process
    pub microphone_usage: Arc<Mutex<HashMap<String, bool>>>,
    /// Simulated lsof command output
    pub lsof_output: Arc<Mutex<String>>,
    /// Whether system commands should fail
    pub should_fail_system_commands: Arc<Mutex<bool>>,
}

impl MockSystemDetector {
    pub fn new() -> Self {
        Self {
            microphone_usage: Arc::new(Mutex::new(HashMap::new())),
            lsof_output: Arc::new(Mutex::new(String::new())),
            should_fail_system_commands: Arc::new(Mutex::new(false)),
        }
    }
    
    /// Set microphone usage for a process
    pub fn set_microphone_usage(&self, process_name: &str, is_using: bool) {
        let mut usage = self.microphone_usage.lock().unwrap();
        usage.insert(process_name.to_string(), is_using);
    }
    
    /// Set simulated lsof output
    pub fn set_lsof_output(&self, output: String) {
        let mut lsof = self.lsof_output.lock().unwrap();
        *lsof = output;
    }
    
    /// Set system command failure
    pub fn set_system_command_failure(&self, should_fail: bool) {
        let mut fail = self.should_fail_system_commands.lock().unwrap();
        *fail = should_fail;
    }
    
    /// Check microphone usage
    pub fn is_using_microphone(&self, process_name: &str) -> Option<bool> {
        if *self.should_fail_system_commands.lock().unwrap() {
            return None;
        }
        
        let usage = self.microphone_usage.lock().unwrap();
        usage.get(process_name).copied()
    }
    
    /// Get lsof output
    pub fn get_lsof_output(&self) -> Option<String> {
        if *self.should_fail_system_commands.lock().unwrap() {
            return None;
        }
        
        Some(self.lsof_output.lock().unwrap().clone())
    }
    
    /// Clear all system data
    pub fn clear(&self) {
        self.microphone_usage.lock().unwrap().clear();
        *self.lsof_output.lock().unwrap() = String::new();
        *self.should_fail_system_commands.lock().unwrap() = false;
    }
}

impl Default for MockSystemDetector {
    fn default() -> Self {
        Self::new()
    }
}

/// Combined mock environment for meeting detection tests
#[derive(Debug, Clone)]
pub struct MockMeetingEnvironment {
    pub browser_checker: MockBrowserChecker,
    pub process_checker: MockProcessChecker,
    pub system_detector: MockSystemDetector,
}

impl MockMeetingEnvironment {
    pub fn new() -> Self {
        Self {
            browser_checker: MockBrowserChecker::new(),
            process_checker: MockProcessChecker::new(),
            system_detector: MockSystemDetector::new(),
        }
    }
    
    /// Set up a Google Meet scenario
    pub fn setup_google_meet_scenario(&self) {
        self.browser_checker.set_running_browsers(vec!["Google Chrome".to_string()]);
        self.browser_checker.add_browser_url("Google Chrome", "https://meet.google.com/abc-def-ghi".to_string());
    }
    
    /// Set up a Zoom scenario
    pub fn setup_zoom_scenario(&self) {
        self.process_checker.set_process_running("zoom.us", true);
        self.process_checker.set_process_output("user    1234  zoom.us CptHost".to_string());
    }
    
    /// Set up a Teams scenario
    pub fn setup_teams_scenario(&self) {
        self.process_checker.set_process_running("Microsoft Teams", true);
        self.browser_checker.add_browser_url("Google Chrome", "https://teams.microsoft.com/l/meetup-join/12345".to_string());
    }
    
    /// Set up a Slack Huddle scenario
    pub fn setup_slack_huddle_scenario(&self) {
        self.process_checker.set_process_running("Slack", true);
        self.browser_checker.add_browser_url("Google Chrome", "https://app.slack.com/huddle/T12345/D67890".to_string());
    }
    
    /// Set up a Discord scenario
    pub fn setup_discord_scenario(&self) {
        self.process_checker.set_process_running("Discord", true);
    }
    
    /// Set up no meeting scenario
    pub fn setup_no_meeting_scenario(&self) {
        // Clear all data to simulate no meetings
        self.browser_checker.clear();
        self.process_checker.clear();
        self.system_detector.clear();
    }
    
    /// Clear all mock data
    pub fn clear_all(&self) {
        self.browser_checker.clear();
        self.process_checker.clear();
        self.system_detector.clear();
    }
}

impl Default for MockMeetingEnvironment {
    fn default() -> Self {
        Self::new()
    }
}

/// Test fixtures for meeting detection scenarios
pub mod fixtures {
    /// Common Google Meet URLs for testing
    pub const GOOGLE_MEET_ROOM_URLS: &[&str] = &[
        "https://meet.google.com/abc-def-ghi",
        "https://meet.google.com/xyz-123-456?authuser=0",
        "https://meet.google.com/lookup/abc123def456",
        "https://meet.google.com/new-meeting-room",
    ];
    
    /// Google Meet URLs that should NOT be detected as meetings
    pub const GOOGLE_MEET_NON_ROOM_URLS: &[&str] = &[
        "https://meet.google.com/",
        "https://meet.google.com/landing",
        "https://meet.google.com/_meet",
        "https://meet.google.com/?authuser=0",
        "https://meet.google.com/settings",
    ];
    
    /// Zoom meeting URLs
    pub const ZOOM_MEETING_URLS: &[&str] = &[
        "https://zoom.us/j/1234567890",
        "https://zoom.us/wc/1234567890",
        "https://zoom.us/j/1234567890?pwd=abcdef",
    ];
    
    /// Teams meeting URLs  
    pub const TEAMS_MEETING_URLS: &[&str] = &[
        "https://teams.microsoft.com/l/meetup-join/12345",
        "https://teams.live.com/meet/12345",
    ];
    
    /// Slack Huddle URLs
    pub const SLACK_HUDDLE_URLS: &[&str] = &[
        "https://app.slack.com/huddle/T12345/D67890", 
        "https://slack.com/huddle/T12345",
    ];
    
    /// Process output samples for testing
    pub const ZOOM_PROCESS_OUTPUT: &str = "user    1234  zoom.us CptHost meeting";
    pub const TEAMS_PROCESS_OUTPUT: &str = "user    5678  Microsoft Teams --type=renderer";
    pub const SLACK_PROCESS_OUTPUT: &str = "user    9012  Slack Helper --type=gpu-process";
    pub const DISCORD_PROCESS_OUTPUT: &str = "user    3456  Discord --no-sandbox";
    
    /// Microphone usage lsof output samples
    pub const MICROPHONE_LSOF_OUTPUT: &str = r#"
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
zoom.us  1234 user   10u  CHR   14,2      0t0  123 /dev/audio
Chrome   5678 user   15u  CHR   14,2      0t0  456 /dev/mic
"#;
}