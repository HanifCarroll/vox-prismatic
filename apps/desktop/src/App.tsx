import "./App.css";
import { useState } from "react";
import { Settings } from "lucide-react";
import { MeetingIndicator } from "./components/MeetingIndicator";
import { RecordingControls } from "./components/RecordingControls";
import { RecordingsList } from "./components/RecordingsList";
import { SettingsPanel } from "./components/SettingsPanel";
import { useRecordingState } from "./hooks/useRecordingState";

function App() {
	const [showSettings, setShowSettings] = useState(false);
	
	const {
		recordingState,
		recordingDuration,
		recentRecordings,
		transcribingIds,
		handleStartRecording,
		handlePauseRecording,
		handleStopRecording,
		handleResumeRecording,
		formatDuration,
		refreshAppState,
	} = useRecordingState();




	if (showSettings) {
		return (
			<div className="w-80 h-[480px] bg-white/98 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-6 overflow-hidden">
				<SettingsPanel onClose={() => setShowSettings(false)} />
			</div>
		);
	}

	return (
		<div className="w-80 h-[480px] bg-white/98 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-6 overflow-hidden">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-light text-gray-900 tracking-wide">
						Content Recorder
					</h1>
					<div className="flex items-center space-x-2">
						<button
							onClick={() => setShowSettings(true)}
							className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
							title="Settings"
						>
							<Settings className="w-4 h-4" />
						</button>
						<MeetingIndicator />
					</div>
				</div>
			</div>

			{/* Recording Controls */}
			<RecordingControls
				recordingState={recordingState}
				recordingDuration={recordingDuration}
				formatDuration={formatDuration}
				onStart={handleStartRecording}
				onPause={handlePauseRecording}
				onResume={handleResumeRecording}
				onStop={handleStopRecording}
			/>

			{/* Recent Recordings */}
			<RecordingsList 
				recordings={recentRecordings} 
				transcribingIds={transcribingIds}
				onRecordingsChange={refreshAppState} 
			/>
		</div>
	);
}

export default App;
