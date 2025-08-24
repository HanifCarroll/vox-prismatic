use crossbeam_channel::{Receiver, Sender, unbounded};
use std::thread::{self, JoinHandle};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use crate::events::EventEmitter;

// Audio recording imports
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, StreamConfig};
use hound::{WavSpec, WavWriter, SampleFormat};

/// Commands for audio thread management
#[derive(Debug)]
pub enum AudioCommand {
    StartRecording { file_path: PathBuf },
    StopRecording,
    StartPlayback { file_path: PathBuf, app_handle: tauri::AppHandle },
    StopPlayback,
}

/// Audio recorder state - only stores thread-safe data
#[derive(Debug)]
pub struct RecorderState {
    // Channel to send commands to the audio manager thread
    command_sender: Option<Sender<AudioCommand>>,
    // Handle to the audio manager thread
    audio_thread: Option<JoinHandle<()>>,
    // Current recording file path
    current_file_path: Option<PathBuf>,
    // Recording status
    is_recording: bool,
}

impl RecorderState {
    pub fn new() -> Self {
        Self {
            command_sender: None,
            audio_thread: None,
            current_file_path: None,
            is_recording: false,
        }
    }

    pub fn initialize(&mut self) -> Result<(), String> {
        if self.command_sender.is_some() {
            return Ok(()); // Already initialized
        }

        // Create command channel for audio thread
        let (command_sender, command_receiver) = unbounded::<AudioCommand>();
        
        // Start audio manager thread
        let audio_thread = thread::spawn(move || {
            audio_manager_thread(command_receiver);
        });
        
        self.command_sender = Some(command_sender);
        self.audio_thread = Some(audio_thread);
        
        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        self.is_recording
    }

    /// Send a command to the audio thread
    pub fn send_command(&self, command: AudioCommand) -> Result<(), String> {
        if let Some(ref sender) = self.command_sender {
            sender.send(command).map_err(|e| format!("Failed to send audio command: {}", e))
        } else {
            Err("Audio system not initialized".to_string())
        }
    }

    /// Update the recording state
    pub fn set_recording(&mut self, is_recording: bool) {
        self.is_recording = is_recording;
    }

    /// Update the current file path
    pub fn set_current_file_path(&mut self, file_path: Option<PathBuf>) {
        self.current_file_path = file_path;
    }

    /// Clean up audio system resources
    pub fn cleanup(&mut self) {
        self.command_sender = None;
        self.audio_thread = None;
        self.current_file_path = None;
        self.is_recording = false;
    }

    /// Check if command sender is initialized
    pub fn is_initialized(&self) -> bool {
        self.command_sender.is_some()
    }
}

/// Helper function to get audio device and config
fn get_audio_device_and_config() -> Result<(Device, StreamConfig), String> {
    let host = cpal::default_host();
    
    // Try to get default input device (microphone)
    let device = host.default_input_device()
        .ok_or_else(|| "No input device available".to_string())?;
    
    // Get the default input configuration
    let config = device.default_input_config()
        .map_err(|e| format!("Failed to get default input config: {}", e))?;
    
    Ok((device, config.into()))
}

/// Audio manager that runs in a separate thread and handles the cpal stream
pub fn audio_manager_thread(command_receiver: Receiver<AudioCommand>) {
    let mut current_stream: Option<cpal::Stream> = None;
    let mut current_writer_sender: Option<Sender<f32>> = None;
    
    while let Ok(command) = command_receiver.recv() {
        match command {
            AudioCommand::StartRecording { file_path } => {
                handle_start_recording(&mut current_stream, &mut current_writer_sender, &file_path);
            }
            AudioCommand::StopRecording => {
                handle_stop_recording(&mut current_stream, &mut current_writer_sender);
            }
            AudioCommand::StartPlayback { file_path, app_handle } => {
                handle_start_playback(&mut current_stream, &mut current_writer_sender, &file_path, app_handle);
            }
            AudioCommand::StopPlayback => {
                handle_stop_playback(&mut current_stream, &mut current_writer_sender);
            }
        }
    }
}

fn handle_start_recording(
    current_stream: &mut Option<cpal::Stream>,
    current_writer_sender: &mut Option<Sender<f32>>,
    file_path: &PathBuf
) {
    // Stop any existing recording
    if let Some(stream) = current_stream.take() {
        drop(stream);
    }
    if let Some(sender) = current_writer_sender.take() {
        drop(sender);
    }
    
    // Start new recording
    match start_audio_recording(file_path) {
        Ok((stream, writer_sender)) => {
            *current_stream = Some(stream);
            *current_writer_sender = Some(writer_sender);
            println!("Started recording to: {}", file_path.display());
        }
        Err(e) => {
            eprintln!("Failed to start recording: {}", e);
        }
    }
}

fn handle_stop_recording(
    current_stream: &mut Option<cpal::Stream>,
    current_writer_sender: &mut Option<Sender<f32>>
) {
    // Stop recording by dropping the stream and sender
    if let Some(stream) = current_stream.take() {
        drop(stream);
    }
    if let Some(sender) = current_writer_sender.take() {
        drop(sender);
        // Give writer thread time to finalize the WAV file
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    println!("Stopped audio recording");
}

fn handle_start_playback(
    current_stream: &mut Option<cpal::Stream>,
    current_writer_sender: &mut Option<Sender<f32>>,
    file_path: &PathBuf,
    app_handle: tauri::AppHandle
) {
    // Stop any existing stream
    if let Some(stream) = current_stream.take() {
        drop(stream);
    }
    if let Some(sender) = current_writer_sender.take() {
        drop(sender);
    }
    
    // Start playback
    match start_audio_playback(file_path, app_handle) {
        Ok(stream) => {
            *current_stream = Some(stream);
        }
        Err(e) => {
            eprintln!("Failed to start playback: {}", e);
        }
    }
}

fn handle_stop_playback(
    current_stream: &mut Option<cpal::Stream>,
    current_writer_sender: &mut Option<Sender<f32>>
) {
    // Stop playback by dropping the stream
    if let Some(stream) = current_stream.take() {
        drop(stream);
    }
    if let Some(sender) = current_writer_sender.take() {
        drop(sender);
    }
}

/// Helper function to start audio recording (returns the stream and writer sender)
fn start_audio_recording(file_path: &PathBuf) -> Result<(cpal::Stream, Sender<f32>), String> {
    // Get audio device and config first to match sample rate
    let (device, config) = get_audio_device_and_config()?;
    println!("Using audio device sample rate: {} Hz, channels: {}", config.sample_rate.0, config.channels);
    
    // Setup WAV writer specification matching device config
    let spec = WavSpec {
        channels: config.channels as u16,
        sample_rate: config.sample_rate.0,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    // Create WAV writer
    let writer = WavWriter::create(&file_path, spec)
        .map_err(|e| format!("Failed to create WAV writer: {}", e))?;
    let writer = Arc::new(Mutex::new(Some(writer)));

    // Create channel for audio data
    let (sender, receiver) = unbounded::<f32>();

    // Spawn writer thread
    let writer_clone = writer.clone();
    thread::spawn(move || {
        while let Ok(sample) = receiver.recv() {
            // Convert f32 sample to i16 for WAV file
            let amplitude = i16::MAX as f32;
            let sample_i16 = (sample.clamp(-1.0, 1.0) * amplitude) as i16;
            
            if let Some(writer) = writer_clone.lock().unwrap().as_mut() {
                if let Err(e) = writer.write_sample(sample_i16) {
                    eprintln!("Failed to write audio sample: {}", e);
                    break;
                }
            }
        }
        
        // Finalize the file when channel closes
        if let Some(writer) = writer_clone.lock().unwrap().take() {
            if let Err(e) = writer.finalize() {
                eprintln!("Failed to finalize WAV file: {}", e);
            }
        }
    });

    // Create audio stream
    let sender_clone = sender.clone();
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            // Send audio data to writer thread
            for &sample in data.iter() {
                if sender_clone.send(sample).is_err() {
                    break;
                }
            }
        },
        |err| {
            eprintln!("Audio stream error: {}", err);
        },
        None,
    ).map_err(|e| format!("Failed to build audio stream: {}", e))?;

    // Start the stream
    stream.play().map_err(|e| format!("Failed to start audio stream: {}", e))?;
    
    Ok((stream, sender))
}

/// Helper function to start audio playback (returns the playback stream)
fn start_audio_playback(file_path: &PathBuf, app_handle: tauri::AppHandle) -> Result<cpal::Stream, String> {
    // Get audio device and config for output
    let host = cpal::default_host();
    let device = host.default_output_device()
        .ok_or_else(|| "No output device available".to_string())?;
    
    // Read the WAV file to get its configuration
    let mut reader = hound::WavReader::open(file_path)
        .map_err(|e| format!("Failed to open WAV file: {}", e))?;
    
    let wav_spec = reader.spec();
    
    // Create output config matching the WAV file
    let config = cpal::StreamConfig {
        channels: wav_spec.channels,
        sample_rate: cpal::SampleRate(wav_spec.sample_rate),
        buffer_size: cpal::BufferSize::Default,
    };
    
    // Read all samples from WAV file
    let samples: Vec<f32> = reader.samples::<i16>()
        .map(|s| s.unwrap_or(0) as f32 / i16::MAX as f32)
        .collect();
    
    let samples = Arc::new(samples);
    let sample_index = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let playback_finished = Arc::new(std::sync::atomic::AtomicBool::new(false));
    
    // Create output stream
    let samples_clone = samples.clone();
    let sample_index_clone = sample_index.clone();
    let playback_finished_clone = playback_finished.clone();
    let app_handle_clone = app_handle.clone();
    
    let stream = device.build_output_stream(
        &config,
        move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
            for frame in data.iter_mut() {
                let index = sample_index_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                if index < samples_clone.len() {
                    *frame = samples_clone[index];
                } else {
                    *frame = 0.0; // Silence when playback is done
                    
                    // Check if this is the first time we've finished
                    if !playback_finished_clone.load(std::sync::atomic::Ordering::Relaxed) {
                        playback_finished_clone.store(true, std::sync::atomic::Ordering::Relaxed);
                        // Emit event to frontend that playback finished
                        EventEmitter::playback_finished(&app_handle_clone);
                    }
                }
            }
        },
        |err| {
            eprintln!("Audio playback error: {}", err);
        },
        None,
    ).map_err(|e| format!("Failed to build playback stream: {}", e))?;
    
    // Start playback
    stream.play().map_err(|e| format!("Failed to start playback: {}", e))?;
    
    Ok(stream)
}