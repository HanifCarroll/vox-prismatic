import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
	Circle,
	Loader2,
	Pause,
	Play,
	Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import "./App.css";
import { MeetingIndicator } from "./components/MeetingIndicator";

type RecordingState = "idle" | "recording" | "paused" | "processing";

interface Recording {
	id: string;
	filename: string;
	duration: string;
	timestamp: Date;
	status: "local" | "uploaded" | "failed";
}

function App() {
	const [recordingState, setRecordingState] = useState<RecordingState>("idle");
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);

	// Initialize app and load recent recordings
	useEffect(() => {
		console.log("App initialized");

		// Load recent recordings on startup
		const loadRecordings = async () => {
			try {
				const recordings = (await invoke(
					"get_recent_recordings",
				)) as Recording[];
				setRecentRecordings(recordings);
			} catch (error) {
				console.error("Failed to load recordings:", error);
			}
		};

		loadRecordings();
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

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

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




	return (
		<div className="w-80 h-[480px] bg-white/98 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-6 overflow-hidden">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-light text-gray-900 tracking-wide">
						Content Recorder
					</h1>
					<MeetingIndicator />
				</div>
			</div>

			{/* Recording Controls */}
			<div className="mb-8">
				{recordingState === "idle" && (
					<button
						onClick={handleStartRecording}
						className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-3"
					>
						<Circle className="w-5 h-5 fill-current" />
						Start Recording
					</button>
				)}

				{recordingState === "recording" && (
					<div className="space-y-4">
						<div className="flex items-center justify-center p-6 bg-red-50/80 rounded-xl border border-red-100">
							<div className="text-center">
								<div className="flex items-center justify-center gap-2 mb-2">
									<Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse-slow" />
									<span className="text-sm font-medium text-red-600">
										RECORDING
									</span>
								</div>
								<span className="font-mono text-2xl font-light text-gray-900">
									{formatDuration(recordingDuration)}
								</span>
							</div>
						</div>
						<div className="flex gap-3">
							<button
								onClick={handlePauseRecording}
								className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
							>
								<Pause className="w-4 h-4" />
								Pause
							</button>
							<button
								onClick={handleStopRecording}
								className="flex-1 h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
							>
								<Square className="w-4 h-4" />
								Stop
							</button>
						</div>
					</div>
				)}

				{recordingState === "paused" && (
					<div className="space-y-4">
						<div className="flex items-center justify-center p-6 bg-amber-50/80 rounded-xl border border-amber-100">
							<div className="text-center">
								<div className="flex items-center justify-center gap-2 mb-2">
									<Pause className="w-3 h-3 text-amber-600" />
									<span className="text-sm font-medium text-amber-700">
										PAUSED
									</span>
								</div>
								<span className="font-mono text-2xl font-light text-gray-900">
									{formatDuration(recordingDuration)}
								</span>
							</div>
						</div>
						<div className="flex gap-3">
							<button
								onClick={handleResumeRecording}
								className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
							>
								<Play className="w-4 h-4" />
								Resume
							</button>
							<button
								onClick={handleStopRecording}
								className="flex-1 h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
							>
								<Square className="w-4 h-4" />
								Stop
							</button>
						</div>
					</div>
				)}

				{recordingState === "processing" && (
					<div className="flex flex-col items-center gap-4 py-8">
						<Loader2 className="w-8 h-8 animate-spin text-gray-400" />
						<span className="text-sm text-gray-500 font-light">
							Processing recording...
						</span>
					</div>
				)}
			</div>

			{/* Recent Recordings */}
			<div className="">
				<h2 className="text-sm font-medium text-gray-600 mb-3 tracking-wide">
					Recent Recordings
				</h2>
					{recentRecordings.length > 0 ? (
						<div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
							{recentRecordings.map((recording, index) => (
								<div
									key={recording.id}
									className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-gray-900 truncate">
											{recording.filename}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">
											{recording.duration}
										</p>
									</div>
									<div className="w-2 h-2 rounded-full bg-green-400"></div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-12 text-sm text-gray-400 font-light">
							No recordings yet
						</div>
					)}
			</div>

		</div>
	);
}

export default App;
