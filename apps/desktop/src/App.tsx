import "./App.css";
import { MeetingIndicator } from "./components/MeetingIndicator";
import { RecordingControls } from "./components/RecordingControls";
import { RecordingsList } from "./components/RecordingsList";
import { useRecordingState } from "./hooks/useRecordingState";

function App() {
	const {
		recordingState,
		recordingDuration,
		recentRecordings,
		handleStartRecording,
		handlePauseRecording,
		handleStopRecording,
		handleResumeRecording,
		formatDuration,
	} = useRecordingState();




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
			<RecordingsList recordings={recentRecordings} />
		</div>
	);
}

export default App;
