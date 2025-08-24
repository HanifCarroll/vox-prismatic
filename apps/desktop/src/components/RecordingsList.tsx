import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ConfirmDialog } from "./ConfirmDialog";
import type { Recording } from "../types";

interface RecordingsListProps {
	recordings: Recording[];
	onRecordingsChange?: () => void;
}

export function RecordingsList({ recordings, onRecordingsChange }: RecordingsListProps) {
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		recording: Recording | null;
	}>({ isOpen: false, recording: null });

	const handleOpenFolder = async () => {
		try {
			await invoke('open_recordings_folder');
		} catch (error) {
			console.error('Failed to open recordings folder:', error);
		}
	};

	// Listen for playback finished event to reset play button state
	useEffect(() => {
		const unlisten = listen('playback-finished', () => {
			setPlayingId(null);
		});

		return () => {
			unlisten.then(f => f());
		};
	}, []);

	const handlePlay = async (recording: Recording) => {
		try {
			if (playingId === recording.id) {
				// Stop if currently playing this recording
				await invoke('stop_playback');
				setPlayingId(null);
			} else {
				// Start playing this recording
				await invoke('play_recording', { recordingId: recording.id });
				setPlayingId(recording.id);
			}
		} catch (error) {
			console.error('Playback failed:', error);
		}
	};

	const handleDelete = async (recording: Recording) => {
		if (deletingId) return; // Prevent double-clicks
		
		// Show custom confirmation dialog
		setConfirmDialog({ isOpen: true, recording });
	};

	const handleConfirmDelete = async () => {
		const recording = confirmDialog.recording;
		if (!recording) return;

		setConfirmDialog({ isOpen: false, recording: null });
		setDeletingId(recording.id);
		
		try {
			await invoke('delete_recording', { recordingId: recording.id });
			// Refresh the recordings list
			onRecordingsChange?.();
		} catch (error) {
			console.error('Delete failed:', error);
		} finally {
			setDeletingId(null);
		}
	};

	const handleCancelDelete = () => {
		setConfirmDialog({ isOpen: false, recording: null });
	};
	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-sm font-medium text-gray-600 tracking-wide">
					Recent Recordings
				</h2>
				<button
					onClick={handleOpenFolder}
					className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
					title="Open recordings folder"
				>
					<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
					</svg>
				</button>
			</div>
			{recordings.length > 0 ? (
				<div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
					{recordings.map((recording, index) => (
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
							<div className="flex items-center space-x-2">
								{/* Play/Stop Button */}
								<button
									onClick={() => handlePlay(recording)}
									className={`p-1.5 rounded-md transition-colors ${
										playingId === recording.id
											? "bg-red-100 hover:bg-red-200 text-red-600"
											: "bg-blue-100 hover:bg-blue-200 text-blue-600"
									}`}
									title={playingId === recording.id ? "Stop playback" : "Play recording"}
								>
									{playingId === recording.id ? (
										<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H8zM11 8a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1h-1a1 1 0 01-1-1V8z" clipRule="evenodd" />
										</svg>
									) : (
										<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
										</svg>
									)}
								</button>

								{/* Delete Button */}
								<button
									onClick={() => handleDelete(recording)}
									disabled={deletingId === recording.id}
									className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									title="Delete recording"
								>
									{deletingId === recording.id ? (
										<svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									) : (
										<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
										</svg>
									)}
								</button>

								{/* Status Indicator */}
								<div className={`w-2 h-2 rounded-full ${
									recording.status === "local"
										? "bg-green-400"
										: recording.status === "uploaded"
										? "bg-blue-400"
										: "bg-red-400"
								}`} />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="text-center py-12 text-sm text-gray-400 font-light">
					No recordings yet
				</div>
			)}
			
			{/* Custom Confirmation Dialog */}
			<ConfirmDialog
				isOpen={confirmDialog.isOpen}
				title="Delete Recording"
				message={`Are you sure you want to delete "${confirmDialog.recording?.filename}"? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
				onConfirm={handleConfirmDelete}
				onCancel={handleCancelDelete}
			/>
		</div>
	);
}