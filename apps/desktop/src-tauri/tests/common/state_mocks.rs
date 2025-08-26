/// Mock infrastructure for testing state management patterns
/// 
/// These mocks allow testing Arc<Mutex<T>> synchronization, thread communication,
/// and state consistency without requiring actual audio hardware or system resources.

use std::collections::VecDeque;
use std::sync::{Arc, Mutex, mpsc};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use std::path::PathBuf;
use mockall::predicate::*;
use mockall::mock;

/// Mock for audio thread operations without actual audio processing
#[derive(Debug, Clone)]
pub struct MockAudioThread {
    /// Simulated command queue
    pub command_queue: Arc<Mutex<VecDeque<MockAudioCommand>>>,
    /// Whether the thread is "running"
    pub is_running: Arc<Mutex<bool>>,
    /// Simulated thread execution results
    pub execution_results: Arc<Mutex<Vec<MockExecutionResult>>>,
    /// Mock file operations
    pub file_operations: Arc<Mutex<Vec<String>>>,
}

#[derive(Debug, Clone)]
pub enum MockAudioCommand {
    StartRecording { file_path: PathBuf },
    StopRecording,
    StartPlayback { file_path: PathBuf },
    StopPlayback,
    Shutdown,
}

#[derive(Debug, Clone)]
pub struct MockExecutionResult {
    pub command: MockAudioCommand,
    pub success: bool,
    pub execution_time: Duration,
    pub error_message: Option<String>,
}

impl MockAudioThread {
    pub fn new() -> Self {
        Self {
            command_queue: Arc::new(Mutex::new(VecDeque::new())),
            is_running: Arc::new(Mutex::new(false)),
            execution_results: Arc::new(Mutex::new(Vec::new())),
            file_operations: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    /// Start the mock audio thread
    pub fn start(&self) -> MockThreadHandle {
        let mut running = self.is_running.lock().unwrap();
        *running = true;
        
        let command_queue = self.command_queue.clone();
        let is_running = self.is_running.clone();
        let execution_results = self.execution_results.clone();
        let file_operations = self.file_operations.clone();
        
        let handle = thread::spawn(move || {
            while *is_running.lock().unwrap() {
                if let Some(command) = command_queue.lock().unwrap().pop_front() {
                    let start_time = Instant::now();
                    
                    // Simulate command execution
                    let (success, error_message) = match &command {
                        MockAudioCommand::StartRecording { file_path } => {
                            file_operations.lock().unwrap().push(format!("create_file:{}", file_path.display()));
                            thread::sleep(Duration::from_millis(10)); // Simulate work
                            (true, None)
                        },
                        MockAudioCommand::StopRecording => {
                            file_operations.lock().unwrap().push("finalize_file".to_string());
                            thread::sleep(Duration::from_millis(5));
                            (true, None)
                        },
                        MockAudioCommand::StartPlayback { file_path } => {
                            if file_path.exists() {
                                file_operations.lock().unwrap().push(format!("read_file:{}", file_path.display()));
                                (true, None)
                            } else {
                                (false, Some("File not found".to_string()))
                            }
                        },
                        MockAudioCommand::StopPlayback => {
                            file_operations.lock().unwrap().push("stop_playback".to_string());
                            (true, None)
                        },
                        MockAudioCommand::Shutdown => {
                            *is_running.lock().unwrap() = false;
                            (true, None)
                        }
                    };
                    
                    let execution_time = start_time.elapsed();
                    execution_results.lock().unwrap().push(MockExecutionResult {
                        command,
                        success,
                        execution_time,
                        error_message,
                    });
                } else {
                    thread::sleep(Duration::from_millis(1)); // Prevent busy loop
                }
            }
        });
        
        MockThreadHandle {
            handle: Some(handle),
            thread_id: format!("mock_audio_thread_{}", rand::random::<u32>()),
        }
    }
    
    /// Send a command to the mock thread
    pub fn send_command(&self, command: MockAudioCommand) -> Result<(), String> {
        if !*self.is_running.lock().unwrap() {
            return Err("Thread not running".to_string());
        }
        
        self.command_queue.lock().unwrap().push_back(command);
        Ok(())
    }
    
    /// Get execution results
    pub fn get_execution_results(&self) -> Vec<MockExecutionResult> {
        self.execution_results.lock().unwrap().clone()
    }
    
    /// Get file operations history
    pub fn get_file_operations(&self) -> Vec<String> {
        self.file_operations.lock().unwrap().clone()
    }
    
    /// Check if thread is running
    pub fn is_thread_running(&self) -> bool {
        *self.is_running.lock().unwrap()
    }
    
    /// Stop the mock thread
    pub fn stop(&self) {
        let _ = self.send_command(MockAudioCommand::Shutdown);
    }
    
    /// Clear all state
    pub fn clear(&self) {
        self.command_queue.lock().unwrap().clear();
        self.execution_results.lock().unwrap().clear();
        self.file_operations.lock().unwrap().clear();
        *self.is_running.lock().unwrap() = false;
    }
}

impl Default for MockAudioThread {
    fn default() -> Self {
        Self::new()
    }
}

/// Mock thread handle for testing thread lifecycle
#[derive(Debug)]
pub struct MockThreadHandle {
    pub handle: Option<JoinHandle<()>>,
    pub thread_id: String,
}

impl MockThreadHandle {
    pub fn join(mut self) -> Result<(), String> {
        if let Some(handle) = self.handle.take() {
            handle.join().map_err(|e| format!("Thread join failed: {:?}", e))
        } else {
            Err("Handle already consumed".to_string())
        }
    }
    
    pub fn is_finished(&self) -> bool {
        self.handle.as_ref().map_or(true, |h| h.is_finished())
    }
}

/// Mock for testing command channel communication
#[derive(Debug)]
pub struct MockCommandSender<T> {
    pub sent_commands: Arc<Mutex<Vec<T>>>,
    pub should_fail: Arc<Mutex<bool>>,
    pub failure_message: Arc<Mutex<String>>,
}

impl<T> MockCommandSender<T> 
where
    T: Clone + std::fmt::Debug,
{
    pub fn new() -> Self {
        Self {
            sent_commands: Arc::new(Mutex::new(Vec::new())),
            should_fail: Arc::new(Mutex::new(false)),
            failure_message: Arc::new(Mutex::new("Mock failure".to_string())),
        }
    }
    
    /// Send a command (mock implementation)
    pub fn send(&self, command: T) -> Result<(), String> {
        if *self.should_fail.lock().unwrap() {
            let message = self.failure_message.lock().unwrap().clone();
            return Err(message);
        }
        
        self.sent_commands.lock().unwrap().push(command);
        Ok(())
    }
    
    /// Get sent commands
    pub fn get_sent_commands(&self) -> Vec<T> {
        self.sent_commands.lock().unwrap().clone()
    }
    
    /// Set failure mode
    pub fn set_failure(&self, should_fail: bool, message: Option<String>) {
        *self.should_fail.lock().unwrap() = should_fail;
        if let Some(msg) = message {
            *self.failure_message.lock().unwrap() = msg;
        }
    }
    
    /// Clear sent commands
    pub fn clear(&self) {
        self.sent_commands.lock().unwrap().clear();
    }
}

impl<T> Default for MockCommandSender<T>
where
    T: Clone + std::fmt::Debug,
{
    fn default() -> Self {
        Self::new()
    }
}

/// Mock for testing concurrent state modifications
#[derive(Debug, Clone)]
pub struct MockSharedState<T> {
    pub state: Arc<Mutex<T>>,
    pub access_log: Arc<Mutex<Vec<StateAccess>>>,
    pub modification_count: Arc<Mutex<u64>>,
}

#[derive(Debug, Clone)]
pub struct StateAccess {
    pub thread_id: String,
    pub access_type: AccessType,
    pub timestamp: Instant,
    pub duration: Duration,
}

#[derive(Debug, Clone)]
pub enum AccessType {
    Read,
    Write,
    ReadWrite,
}

impl<T> MockSharedState<T>
where
    T: Clone + std::fmt::Debug,
{
    pub fn new(initial_state: T) -> Self {
        Self {
            state: Arc::new(Mutex::new(initial_state)),
            access_log: Arc::new(Mutex::new(Vec::new())),
            modification_count: Arc::new(Mutex::new(0)),
        }
    }
    
    /// Read state with logging
    pub fn read_state<F, R>(&self, reader: F) -> R
    where
        F: FnOnce(&T) -> R,
    {
        let start_time = Instant::now();
        let thread_id = format!("thread_{}", thread::current().id().as_u64());
        
        let state = self.state.lock().unwrap();
        let result = reader(&*state);
        let duration = start_time.elapsed();
        
        drop(state);
        
        self.access_log.lock().unwrap().push(StateAccess {
            thread_id,
            access_type: AccessType::Read,
            timestamp: start_time,
            duration,
        });
        
        result
    }
    
    /// Write state with logging
    pub fn write_state<F, R>(&self, writer: F) -> R
    where
        F: FnOnce(&mut T) -> R,
    {
        let start_time = Instant::now();
        let thread_id = format!("thread_{}", thread::current().id().as_u64());
        
        let mut state = self.state.lock().unwrap();
        let result = writer(&mut *state);
        let duration = start_time.elapsed();
        
        *self.modification_count.lock().unwrap() += 1;
        drop(state);
        
        self.access_log.lock().unwrap().push(StateAccess {
            thread_id,
            access_type: AccessType::Write,
            timestamp: start_time,
            duration,
        });
        
        result
    }
    
    /// Get access log
    pub fn get_access_log(&self) -> Vec<StateAccess> {
        self.access_log.lock().unwrap().clone()
    }
    
    /// Get modification count
    pub fn get_modification_count(&self) -> u64 {
        *self.modification_count.lock().unwrap()
    }
    
    /// Clear access log
    pub fn clear_log(&self) {
        self.access_log.lock().unwrap().clear();
        *self.modification_count.lock().unwrap() = 0;
    }
    
    /// Check for concurrent access patterns
    pub fn has_concurrent_access(&self) -> bool {
        let log = self.access_log.lock().unwrap();
        
        // Look for overlapping access times from different threads
        for i in 0..log.len() {
            for j in (i + 1)..log.len() {
                let access1 = &log[i];
                let access2 = &log[j];
                
                if access1.thread_id != access2.thread_id {
                    let end1 = access1.timestamp + access1.duration;
                    let end2 = access2.timestamp + access2.duration;
                    
                    // Check for overlap
                    if access1.timestamp < end2 && access2.timestamp < end1 {
                        return true;
                    }
                }
            }
        }
        
        false
    }
}

/// Mock recorder state for testing state management patterns
#[derive(Debug, Clone)]
pub struct MockRecorderState {
    pub is_recording: bool,
    pub current_file_path: Option<PathBuf>,
    pub recording_start_time: Option<Instant>,
    pub command_sender: Option<MockCommandSender<MockAudioCommand>>,
    pub thread_handle: Option<String>, // Thread ID string for testing
}

impl MockRecorderState {
    pub fn new() -> Self {
        Self {
            is_recording: false,
            current_file_path: None,
            recording_start_time: None,
            command_sender: None,
            thread_handle: None,
        }
    }
    
    pub fn initialize(&mut self) -> Result<(), String> {
        if self.command_sender.is_some() {
            return Err("Already initialized".to_string());
        }
        
        self.command_sender = Some(MockCommandSender::new());
        self.thread_handle = Some(format!("mock_thread_{}", rand::random::<u32>()));
        Ok(())
    }
    
    pub fn start_recording(&mut self, file_path: PathBuf) -> Result<(), String> {
        if self.is_recording {
            return Err("Already recording".to_string());
        }
        
        if let Some(sender) = &self.command_sender {
            sender.send(MockAudioCommand::StartRecording { file_path: file_path.clone() })?;
        }
        
        self.is_recording = true;
        self.current_file_path = Some(file_path);
        self.recording_start_time = Some(Instant::now());
        
        Ok(())
    }
    
    pub fn stop_recording(&mut self) -> Result<(), String> {
        if !self.is_recording {
            return Err("Not recording".to_string());
        }
        
        if let Some(sender) = &self.command_sender {
            sender.send(MockAudioCommand::StopRecording)?;
        }
        
        self.is_recording = false;
        self.current_file_path = None;
        self.recording_start_time = None;
        
        Ok(())
    }
    
    pub fn is_initialized(&self) -> bool {
        self.command_sender.is_some()
    }
    
    pub fn get_recording_duration(&self) -> Option<Duration> {
        self.recording_start_time.map(|start| start.elapsed())
    }
    
    pub fn cleanup(&mut self) {
        self.is_recording = false;
        self.current_file_path = None;
        self.recording_start_time = None;
        self.command_sender = None;
        self.thread_handle = None;
    }
}

impl Default for MockRecorderState {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper for testing concurrent operations
pub fn run_concurrent_operations<F>(operations: Vec<F>, delay_ms: u64) -> Vec<JoinHandle<()>>
where
    F: FnOnce() + Send + 'static,
{
    operations
        .into_iter()
        .map(|op| {
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(delay_ms));
                op();
            })
        })
        .collect()
}

/// Helper for waiting on multiple thread handles
pub fn wait_for_threads(handles: Vec<JoinHandle<()>>) -> Result<(), String> {
    for (i, handle) in handles.into_iter().enumerate() {
        handle
            .join()
            .map_err(|e| format!("Thread {} failed to join: {:?}", i, e))?;
    }
    Ok(())
}

/// Mock external system dependencies
mock! {
    pub SystemInterface {
        fn get_current_time(&self) -> std::time::SystemTime;
        fn create_file(&self, path: &std::path::Path) -> Result<(), std::io::Error>;
        fn delete_file(&self, path: &std::path::Path) -> Result<(), std::io::Error>;
        fn check_file_exists(&self, path: &std::path::Path) -> bool;
        fn get_thread_id(&self) -> u64;
    }
}

/// Add a simple random number generator for testing
mod rand {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};
    
    pub fn random<T: From<u32>>() -> T {
        let mut hasher = DefaultHasher::new();
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            .hash(&mut hasher);
        
        T::from((hasher.finish() % u32::MAX as u64) as u32)
    }
}