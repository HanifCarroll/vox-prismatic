/// Application-wide constants to eliminate magic numbers and provide a single source of truth.

// Recording Configuration
pub const MAX_RECENT_RECORDINGS: usize = 5;
pub const WAV_HEADER_MIN_BYTES: u64 = 44;

// Timing Constants (in milliseconds)
pub const MEETING_CHECK_INTERVAL_MS: u64 = 2000;  // 2 seconds
pub const WAV_READY_CHECK_DELAY_MS: u64 = 200;    // Wait between WAV file readiness checks
pub const AUDIO_FINALIZATION_DELAY_MS: u64 = 500; // Wait before finalizing audio processing
pub const WRITER_CLEANUP_DELAY_MS: u64 = 100;     // Audio writer thread cleanup delay

// UI Layout Constants (in pixels)
pub const NOTIFICATION_MARGIN_PX: i32 = 20;       // Margin from screen edge
pub const NOTIFICATION_TOP_PX: i32 = 50;          // Distance from top of screen

// Audio Processing Constants
pub const AUDIO_SAMPLE_RATE_STR: &str = "16000";  // String version for API calls

// Retry and Attempt Limits
pub const WAV_READY_MAX_ATTEMPTS: u32 = 5;        // Maximum attempts to check WAV file readiness

// Time Formatting
pub const SECONDS_PER_MINUTE: i64 = 60;           // For duration calculations

// Meeting Detection
pub const MEETING_URL_MAX_CHARS: usize = 20;      // Characters to check in meeting URL patterns
pub const MEETING_URL_MIN_DASHES: usize = 2;      // Minimum dashes for meeting URL detection