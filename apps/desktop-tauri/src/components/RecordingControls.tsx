import {
	Circle,
	Loader2,
	Pause,
	Play,
	Square,
} from "lucide-react";
import type { RecordingState } from "../types";

interface RecordingControlsProps {
	recordingState: RecordingState;
	recordingDuration: number;
	formatDuration: (seconds: number) => string;
	onStart: () => void;
	onPause: () => void;
	onResume: () => void;
	onStop: () => void;
}

export function RecordingControls({
	recordingState,
	recordingDuration,
	formatDuration,
	onStart,
	onPause,
	onResume,
	onStop,
}: RecordingControlsProps) {
	return (
		<div className="mb-8">
			{recordingState === "idle" && (
				<button
					onClick={onStart}
					className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-3"
				>
					<Circle className="w-5 h-5 fill-current" />
					Start Recording
				</button>
			)}

			{recordingState === "recording" && (
				<div className="space-y-4">
					<div className="text-center">
						<div className="text-2xl font-mono text-gray-900 mb-2">
							{formatDuration(recordingDuration)}
						</div>
						<div className="flex items-center justify-center gap-2">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							<span className="text-sm text-gray-600">Recording</span>
						</div>
					</div>
					<div className="flex gap-3">
						<button
							onClick={onPause}
							className="flex-1 h-11 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							<Pause className="w-4 h-4" />
							Pause
						</button>
						<button
							onClick={onStop}
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
					<div className="text-center">
						<div className="text-2xl font-mono text-gray-900 mb-2">
							{formatDuration(recordingDuration)}
						</div>
						<div className="flex items-center justify-center gap-2">
							<div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
							<span className="text-sm text-gray-600">Paused</span>
						</div>
					</div>
					<div className="flex gap-3">
						<button
							onClick={onResume}
							className="flex-1 h-11 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							<Play className="w-4 h-4" />
							Resume
						</button>
						<button
							onClick={onStop}
							className="flex-1 h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							<Square className="w-4 h-4" />
							Stop
						</button>
					</div>
				</div>
			)}

			{recordingState === "processing" && (
				<div className="space-y-4">
					<div className="text-center">
						<div className="text-2xl font-mono text-gray-900 mb-2">
							{formatDuration(recordingDuration)}
						</div>
						<div className="flex items-center justify-center gap-2">
							<Loader2 className="w-4 h-4 animate-spin text-blue-500" />
							<span className="text-sm text-gray-600">Processing recording...</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}