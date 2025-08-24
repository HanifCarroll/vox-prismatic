import type { Recording } from "../types";

interface RecordingsListProps {
	recordings: Recording[];
}

export function RecordingsList({ recordings }: RecordingsListProps) {
	return (
		<div>
			<h2 className="text-sm font-medium text-gray-600 mb-3 tracking-wide">
				Recent Recordings
			</h2>
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
								{/* TODO: Add play and delete buttons here */}
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
		</div>
	);
}