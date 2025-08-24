import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Recording, RecordingState } from "../types";

export function useRecordingState() {
	const [recordingState, setRecordingState] = useState<RecordingState>("idle");
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);

	// Function to refresh state and recordings
	const refreshAppState = async () => {
		try {
			const currentState = (await invoke("get_recording_state")) as string;
			setRecordingState(currentState as RecordingState);
			
			const recordings = (await invoke("get_recent_recordings")) as Recording[];
			setRecentRecordings(recordings);
		} catch (error) {
			console.error("Failed to refresh app state:", error);
		}
	};

	// Initialize app state on mount
	useEffect(() => {
		const initializeState = async () => {
			try {
				// Load recordings from disk first
				await invoke("load_recordings_from_disk");
				
				// Check current recording state
				const currentState = (await invoke("get_recording_state")) as string;
				setRecordingState(currentState as RecordingState);

				// Load recent recordings
				const recordings = (await invoke("get_recent_recordings")) as Recording[];
				setRecentRecordings(recordings);
			} catch (error) {
				console.error("Failed to initialize app state:", error);
			}
		};

		initializeState();
	}, []);

	// Listen for window focus to refresh state
	useEffect(() => {
		const handleWindowFocus = async () => {
			console.log("Window focused - refreshing app state");
			await refreshAppState();
		};

		const currentWindow = getCurrentWindow();
		const unlisten = currentWindow.onFocusChanged(({ payload: focused }) => {
			console.log("Focus changed:", focused);
			if (focused) {
				handleWindowFocus();
			}
		});

		return () => {
			unlisten.then(f => f());
		};
	}, []);

	// Listen for recording state changes from tray menu
	useEffect(() => {
		const setupEventListener = async () => {
			const unlisten = await listen("recording-state-changed", async () => {
				console.log("Recording state changed from tray - refreshing");
				await refreshAppState();
			});

			return unlisten;
		};

		const unlistenPromise = setupEventListener();

		return () => {
			unlistenPromise.then(unlisten => unlisten());
		};
	}, []);

	// Recording timer
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (recordingState === "recording") {
			interval = setInterval(() => {
				setRecordingDuration((prev) => prev + 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [recordingState]);

	// Recording actions
	const handleStartRecording = async () => {
		try {
			await invoke("start_recording");
			setRecordingState("recording");
			setRecordingDuration(0);
		} catch (error) {
			console.error("Failed to start recording:", error);
		}
	};

	const handlePauseRecording = async () => {
		try {
			await invoke("pause_recording");
			setRecordingState("paused");
		} catch (error) {
			console.error("Failed to pause recording:", error);
		}
	};

	const handleStopRecording = async () => {
		try {
			setRecordingState("processing");
			const recording = (await invoke("stop_recording")) as Recording;
			setRecordingState("idle");
			setRecordingDuration(0);
			setRecentRecordings((prev) => [recording, ...prev.slice(0, 4)]);
		} catch (error) {
			console.error("Failed to stop recording:", error);
			setRecordingState("idle");
		}
	};

	const handleResumeRecording = async () => {
		try {
			await invoke("resume_recording");
			setRecordingState("recording");
		} catch (error) {
			console.error("Failed to resume recording:", error);
		}
	};

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	return {
		// State
		recordingState,
		recordingDuration,
		recentRecordings,
		
		// Actions
		handleStartRecording,
		handlePauseRecording,
		handleStopRecording,
		handleResumeRecording,
		refreshAppState,
		
		// Utils
		formatDuration,
		
		// State setters for future use
		setRecentRecordings,
	};
}