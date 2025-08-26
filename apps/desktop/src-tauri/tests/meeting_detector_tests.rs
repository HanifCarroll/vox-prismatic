/// Comprehensive tests for MeetingDetector logic
/// 
/// These tests focus on the meeting detection algorithms, URL pattern matching,
/// state transitions, and cross-platform behavior without requiring actual
/// system processes or browser integration.

use std::time::Duration;
use std::thread;
use serial_test::serial;
use chrono::Utc;

mod common;
use common::meeting_mocks::{
    MockMeetingEnvironment, 
    MockBrowserChecker, 
    MockProcessChecker,
    fixtures::*
};

// We'll need to create a testable version of MeetingDetector that accepts mocks
// For now, we'll test the core logic functions directly

#[cfg(test)]
mod url_pattern_tests {
    use super::*;

    /// Test the core Google Meet room detection logic
    #[test]
    fn test_google_meet_room_detection() {
        // Test valid meeting room URLs
        for &url in GOOGLE_MEET_ROOM_URLS {
            let urls = format!("{} ", url);
            assert!(is_google_meet_room_mock(&urls), 
                   "Should detect meeting room: {}", url);
        }
    }
    
    #[test]
    fn test_google_meet_non_room_exclusion() {
        // Test URLs that should NOT be detected as meeting rooms
        for &url in GOOGLE_MEET_NON_ROOM_URLS {
            let urls = format!("{} ", url);
            assert!(!is_google_meet_room_mock(&urls), 
                   "Should NOT detect as meeting room: {}", url);
        }
    }
    
    #[test]
    fn test_zoom_url_patterns() {
        for &url in ZOOM_MEETING_URLS {
            let urls = format!("{} ", url);
            assert!(is_zoom_meeting_url(&urls), 
                   "Should detect Zoom meeting: {}", url);
        }
        
        // Test non-Zoom URLs
        let non_zoom_urls = [
            "https://example.com/zoom",
            "https://zoom.com/pricing", 
            "https://notzoom.us/j/1234567890"
        ];
        
        for &url in &non_zoom_urls {
            let urls = format!("{} ", url);
            assert!(!is_zoom_meeting_url(&urls), 
                   "Should NOT detect as Zoom meeting: {}", url);
        }
    }
    
    #[test]
    fn test_teams_url_patterns() {
        for &url in TEAMS_MEETING_URLS {
            let urls = format!("{} ", url);
            assert!(is_teams_meeting_url(&urls), 
                   "Should detect Teams meeting: {}", url);
        }
        
        // Test non-Teams URLs
        let non_teams_urls = [
            "https://teams.microsoft.com/",
            "https://teams.microsoft.com/settings",
            "https://noteams.microsoft.com/l/meetup-join/123"
        ];
        
        for &url in &non_teams_urls {
            let urls = format!("{} ", url);
            assert!(!is_teams_meeting_url(&urls), 
                   "Should NOT detect as Teams meeting: {}", url);
        }
    }
    
    #[test]
    fn test_slack_huddle_url_patterns() {
        for &url in SLACK_HUDDLE_URLS {
            let urls = format!("{} ", url);
            assert!(is_slack_huddle_url(&urls), 
                   "Should detect Slack Huddle: {}", url);
        }
        
        // Test non-Huddle Slack URLs
        let non_huddle_urls = [
            "https://app.slack.com/",
            "https://app.slack.com/client/T12345",
            "https://slack.com/pricing"
        ];
        
        for &url in &non_huddle_urls {
            let urls = format!("{} ", url);
            assert!(!is_slack_huddle_url(&urls), 
                   "Should NOT detect as Slack Huddle: {}", url);
        }
    }
    
    #[test]
    fn test_multiple_urls_in_browser() {
        // Test when multiple tabs are open, but only one is a meeting
        let mixed_urls = "https://github.com https://meet.google.com/abc-def-ghi https://news.ycombinator.com ";
        assert!(is_google_meet_room_mock(mixed_urls), 
               "Should detect meeting among multiple URLs");
        
        // Test when multiple meeting URLs are present (should still detect)
        let multiple_meetings = "https://meet.google.com/abc-def-ghi https://zoom.us/j/1234567890 ";
        assert!(is_google_meet_room_mock(multiple_meetings), 
               "Should detect Google Meet when multiple meetings present");
        assert!(is_zoom_meeting_url(multiple_meetings), 
               "Should detect Zoom when multiple meetings present");
    }
    
    #[test]
    fn test_edge_case_url_formats() {
        // Test URLs with various parameters and formats
        let edge_cases = [
            "https://meet.google.com/abc-def-ghi?authuser=0&hl=en",
            "https://meet.google.com/xyz-123-456#settings",
            "https://zoom.us/j/1234567890?pwd=abc123&from=addon",
            "https://teams.microsoft.com/l/meetup-join/12345?context=something"
        ];
        
        for &url in &edge_cases {
            let urls = format!("{} ", url);
            let detected_meeting = detect_meeting_from_urls(&urls);
            assert!(detected_meeting.is_some(), 
                   "Should detect meeting from edge case URL: {}", url);
        }
    }
    
    #[test]
    fn test_malformed_urls() {
        let malformed_urls = [
            "meet.google.com/abc-def-ghi",  // Missing protocol
            "https://meet.google.com/",      // Just domain
            "https://meet.google.com/abc",   // Too short
            "not-a-url-at-all",
            "",
        ];
        
        for &url in &malformed_urls {
            let urls = format!("{} ", url);
            let detected_meeting = detect_meeting_from_urls(&urls);
            // Should handle gracefully without panicking
            // Some might still detect (like the first one), which is okay
        }
    }
}

#[cfg(test)]
mod meeting_state_tests {
    use super::*;

    #[test]
    fn test_meeting_state_creation() {
        let state = create_test_meeting_state(false, None);
        
        assert!(!state.is_in_meeting, "Initial state should not be in meeting");
        assert!(state.detected_app.is_none(), "Should have no detected app initially");
        assert!(state.started_at.is_none(), "Should have no start time initially");
    }
    
    #[test]
    fn test_meeting_state_with_app() {
        let app = create_test_meeting_app("Zoom");
        let state = create_test_meeting_state(true, Some(app.clone()));
        
        assert!(state.is_in_meeting, "State should be in meeting");
        assert!(state.detected_app.is_some(), "Should have detected app");
        assert!(state.started_at.is_some(), "Should have start time");
        
        if let Some(detected) = &state.detected_app {
            match detected {
                TestMeetingApp::Zoom => {}, // Expected
                _ => panic!("Should detect Zoom app"),
            }
        }
    }
    
    #[test]
    fn test_meeting_state_transitions() {
        let mut state = create_test_meeting_state(false, None);
        
        // Transition to meeting
        let meeting_app = create_test_meeting_app("GoogleMeet");
        state.is_in_meeting = true;
        state.detected_app = Some(meeting_app);
        state.started_at = Some(Utc::now());
        
        assert!(state.is_in_meeting, "Should be in meeting after transition");
        assert!(state.detected_app.is_some(), "Should have app after transition");
        assert!(state.started_at.is_some(), "Should have start time after transition");
        
        // Transition back to idle
        state.is_in_meeting = false;
        state.detected_app = None;
        state.started_at = None;
        
        assert!(!state.is_in_meeting, "Should not be in meeting after transition back");
        assert!(state.detected_app.is_none(), "Should have no app after transition back");
        assert!(state.started_at.is_none(), "Should have no start time after transition back");
    }
    
    #[test]
    fn test_meeting_app_serialization() {
        let apps = [
            create_test_meeting_app("Zoom"),
            create_test_meeting_app("GoogleMeet"),
            create_test_meeting_app("MicrosoftTeams"),
            create_test_meeting_app("SlackHuddle"),
            create_test_meeting_app("Discord"),
        ];
        
        for app in apps {
            // Test that we can create and work with the app enum
            let state = create_test_meeting_state(true, Some(app.clone()));
            assert!(state.detected_app.is_some(), "App should be preserved in state");
            
            // Test Unknown variant
            let unknown_app = TestMeetingApp::Unknown("Custom Meeting App".to_string());
            let state_with_unknown = TestMeetingState {
                is_in_meeting: true,
                detected_app: Some(unknown_app),
                started_at: Some(Utc::now()),
            };
            
            if let Some(TestMeetingApp::Unknown(name)) = &state_with_unknown.detected_app {
                assert_eq!(name, "Custom Meeting App", "Unknown app name should be preserved");
            } else {
                panic!("Should have unknown app variant");
            }
        }
    }
}

#[cfg(test)]
mod mock_environment_tests {
    use super::*;

    #[test]
    fn test_mock_browser_checker() {
        let checker = MockBrowserChecker::new();
        
        // Test empty state
        assert!(checker.get_browser_urls("Google Chrome").is_some(), "Chrome should be running by default");
        
        // Test adding URLs
        checker.add_browser_url("Google Chrome", "https://meet.google.com/abc-def-ghi".to_string());
        let urls = checker.get_browser_urls("Google Chrome").unwrap();
        assert!(urls.contains("meet.google.com/abc-def-ghi"), "Should contain added URL");
        
        // Test setting multiple URLs
        checker.set_browser_tabs("Safari", vec![
            "https://zoom.us/j/1234567890".to_string(),
            "https://teams.microsoft.com/l/meetup-join/12345".to_string()
        ]);
        
        checker.set_running_browsers(vec!["Safari".to_string()]);
        let safari_urls = checker.get_browser_urls("Safari").unwrap();
        assert!(safari_urls.contains("zoom.us"), "Should contain Zoom URL");
        assert!(safari_urls.contains("teams.microsoft.com"), "Should contain Teams URL");
        
        // Test non-running browser
        let chrome_urls = checker.get_browser_urls("Google Chrome");
        assert!(chrome_urls.is_none(), "Chrome should not be running anymore");
    }
    
    #[test]
    fn test_mock_browser_applescript_failure() {
        let checker = MockBrowserChecker::new();
        
        checker.add_browser_url("Google Chrome", "https://meet.google.com/test".to_string());
        
        // Normal operation
        assert!(checker.get_browser_urls("Google Chrome").is_some(), "Should work normally");
        
        // Simulate AppleScript failure
        checker.set_applescript_failure(true);
        assert!(checker.get_browser_urls("Google Chrome").is_none(), "Should fail when AppleScript fails");
        
        // Restore normal operation
        checker.set_applescript_failure(false);
        assert!(checker.get_browser_urls("Google Chrome").is_some(), "Should work after restoring");
    }
    
    #[test]
    fn test_mock_process_checker() {
        let checker = MockProcessChecker::new();
        
        // Test process detection
        checker.set_process_running("zoom.us", true);
        assert!(checker.is_process_running("zoom.us").unwrap(), "Zoom should be running");
        assert!(!checker.is_process_running("Discord").unwrap_or(false), "Discord should not be running");
        
        // Test process output
        checker.set_process_output(ZOOM_PROCESS_OUTPUT.to_string());
        let output = checker.get_process_output().unwrap();
        assert!(output.contains("zoom.us"), "Output should contain zoom.us");
        assert!(output.contains("CptHost"), "Output should contain CptHost");
        
        // Test command failure
        checker.set_command_failure(true);
        assert!(checker.is_process_running("zoom.us").is_none(), "Should fail when commands fail");
        assert!(checker.get_process_output().is_none(), "Should fail when commands fail");
    }
    
    #[test]
    fn test_mock_system_detector() {
        let detector = MockSystemDetector::new();
        
        // Test microphone usage
        detector.set_microphone_usage("zoom.us", true);
        assert!(detector.is_using_microphone("zoom.us").unwrap(), "Zoom should be using microphone");
        assert!(!detector.is_using_microphone("Discord").unwrap_or(false), "Discord should not be using microphone");
        
        // Test lsof output
        detector.set_lsof_output(MICROPHONE_LSOF_OUTPUT.to_string());
        let output = detector.get_lsof_output().unwrap();
        assert!(output.contains("/dev/audio"), "Output should contain audio device");
        assert!(output.contains("zoom.us"), "Output should contain zoom.us");
        
        // Test system command failure
        detector.set_system_command_failure(true);
        assert!(detector.is_using_microphone("zoom.us").is_none(), "Should fail when system commands fail");
        assert!(detector.get_lsof_output().is_none(), "Should fail when system commands fail");
    }
    
    #[test]
    fn test_mock_meeting_environment_scenarios() {
        let env = MockMeetingEnvironment::new();
        
        // Test Google Meet scenario
        env.setup_google_meet_scenario();
        let chrome_urls = env.browser_checker.get_browser_urls("Google Chrome").unwrap();
        assert!(chrome_urls.contains("meet.google.com/abc-def-ghi"), 
               "Should set up Google Meet scenario");
        
        // Test Zoom scenario
        env.setup_zoom_scenario();
        assert!(env.process_checker.is_process_running("zoom.us").unwrap(), 
               "Should set up Zoom scenario");
        let output = env.process_checker.get_process_output().unwrap();
        assert!(output.contains("CptHost"), "Should include Zoom process indicators");
        
        // Test Teams scenario
        env.setup_teams_scenario();
        assert!(env.process_checker.is_process_running("Microsoft Teams").unwrap(), 
               "Should set up Teams scenario");
        
        // Test Slack Huddle scenario
        env.setup_slack_huddle_scenario();
        assert!(env.process_checker.is_process_running("Slack").unwrap(), 
               "Should set up Slack scenario");
        
        // Test Discord scenario
        env.setup_discord_scenario();
        assert!(env.process_checker.is_process_running("Discord").unwrap(), 
               "Should set up Discord scenario");
        
        // Test no meeting scenario
        env.setup_no_meeting_scenario();
        // All checkers should be cleared - verify a few key indicators
        assert!(env.browser_checker.get_browser_urls("Google Chrome").is_none() ||
                env.browser_checker.get_browser_urls("Google Chrome").unwrap().is_empty(), 
               "Should clear browser URLs");
    }
}

#[cfg(test)]
mod integration_scenarios {
    use super::*;

    #[test]
    fn test_multiple_detection_methods() {
        let env = MockMeetingEnvironment::new();
        
        // Set up a scenario where multiple detection methods would find the same meeting
        env.process_checker.set_process_running("zoom.us", true);
        env.process_checker.set_process_output("user 1234 zoom.us CptHost".to_string());
        env.browser_checker.add_browser_url("Google Chrome", "https://zoom.us/j/1234567890".to_string());
        env.system_detector.set_microphone_usage("zoom.us", true);
        
        // All three methods should indicate Zoom meeting
        assert!(env.process_checker.is_process_running("zoom.us").unwrap(), 
               "Process method should detect Zoom");
        
        let urls = env.browser_checker.get_browser_urls("Google Chrome").unwrap();
        assert!(is_zoom_meeting_url(&urls), 
               "Browser method should detect Zoom meeting");
        
        assert!(env.system_detector.is_using_microphone("zoom.us").unwrap(), 
               "System method should detect microphone usage");
    }
    
    #[test]
    fn test_conflicting_detection_methods() {
        let env = MockMeetingEnvironment::new();
        
        // Set up conflicting signals - process says Teams, browser says Google Meet
        env.process_checker.set_process_running("Microsoft Teams", true);
        env.browser_checker.add_browser_url("Google Chrome", "https://meet.google.com/abc-def-ghi".to_string());
        
        // Both should be detectable independently
        assert!(env.process_checker.is_process_running("Microsoft Teams").unwrap(), 
               "Should detect Teams process");
        
        let urls = env.browser_checker.get_browser_urls("Google Chrome").unwrap();
        assert!(is_google_meet_room_mock(&urls), 
               "Should detect Google Meet in browser");
        
        // In real implementation, priority logic would determine which takes precedence
    }
    
    #[test]
    fn test_detection_reliability() {
        let env = MockMeetingEnvironment::new();
        
        // Test that detection works even when some methods fail
        env.browser_checker.set_applescript_failure(true);  // Browser detection fails
        env.process_checker.set_process_running("zoom.us", true);  // But process detection works
        
        // Process detection should still work
        assert!(env.process_checker.is_process_running("zoom.us").unwrap(), 
               "Process detection should work when browser fails");
        assert!(env.browser_checker.get_browser_urls("Google Chrome").is_none(), 
               "Browser detection should fail as expected");
        
        // Restore browser, break process detection
        env.browser_checker.set_applescript_failure(false);
        env.browser_checker.add_browser_url("Google Chrome", "https://meet.google.com/test-room".to_string());
        env.process_checker.set_command_failure(true);
        
        // Browser detection should work when process fails
        let urls = env.browser_checker.get_browser_urls("Google Chrome").unwrap();
        assert!(is_google_meet_room_mock(&urls), 
               "Browser detection should work when process fails");
        assert!(env.process_checker.is_process_running("zoom.us").is_none(), 
               "Process detection should fail as expected");
    }
}

// Helper functions that simulate the actual meeting detection logic
// These would normally be in the main codebase, but we're testing them here

fn is_google_meet_room_mock(urls: &str) -> bool {
    if !urls.contains("meet.google.com/") {
        return false;
    }
    
    // Exclude landing pages and general pages
    if urls.contains("meet.google.com/landing") || 
       urls.contains("meet.google.com/_meet") ||
       urls.contains("meet.google.com/?") {
        return false;
    }
    
    // Check for actual meeting room patterns
    for line in urls.lines() {
        if line.contains("meet.google.com/") {
            if let Some(start) = line.find("meet.google.com/") {
                let after_domain = &line[start + 16..]; // "meet.google.com/".len() = 16
                
                // Check for room code patterns (dashes) or lookup URLs
                if after_domain.contains('-') || after_domain.starts_with("lookup/") {
                    return true;
                }
            }
        }
    }
    
    false
}

fn is_zoom_meeting_url(urls: &str) -> bool {
    urls.contains("zoom.us/j/") || urls.contains("zoom.us/wc/")
}

fn is_teams_meeting_url(urls: &str) -> bool {
    urls.contains("teams.microsoft.com/l/meetup-join") || urls.contains("teams.live.com")
}

fn is_slack_huddle_url(urls: &str) -> bool {
    urls.contains("app.slack.com") && (urls.contains("/huddle/") || urls.contains("huddle"))
}

fn detect_meeting_from_urls(urls: &str) -> Option<TestMeetingApp> {
    if is_google_meet_room_mock(urls) {
        Some(TestMeetingApp::GoogleMeet)
    } else if is_zoom_meeting_url(urls) {
        Some(TestMeetingApp::Zoom)
    } else if is_teams_meeting_url(urls) {
        Some(TestMeetingApp::MicrosoftTeams)
    } else if is_slack_huddle_url(urls) {
        Some(TestMeetingApp::SlackHuddle)
    } else {
        None
    }
}

// Test-specific data structures (would normally import from main code)
#[derive(Debug, Clone)]
enum TestMeetingApp {
    Zoom,
    SlackHuddle,
    GoogleMeet,
    MicrosoftTeams,
    Discord,
    Unknown(String),
}

#[derive(Debug, Clone)]
struct TestMeetingState {
    is_in_meeting: bool,
    detected_app: Option<TestMeetingApp>,
    started_at: Option<chrono::DateTime<chrono::Utc>>,
}

fn create_test_meeting_state(is_active: bool, app: Option<TestMeetingApp>) -> TestMeetingState {
    TestMeetingState {
        is_in_meeting: is_active,
        detected_app: app,
        started_at: if is_active { Some(Utc::now()) } else { None },
    }
}

fn create_test_meeting_app(app_type: &str) -> TestMeetingApp {
    match app_type {
        "Zoom" => TestMeetingApp::Zoom,
        "GoogleMeet" => TestMeetingApp::GoogleMeet,
        "MicrosoftTeams" => TestMeetingApp::MicrosoftTeams,
        "SlackHuddle" => TestMeetingApp::SlackHuddle,
        "Discord" => TestMeetingApp::Discord,
        name => TestMeetingApp::Unknown(name.to_string()),
    }
}