interface TranscriptActionBarProps {
	onAddTranscript: () => void;
	selectedCount: number;
	onBulkAction: (action: string) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
}

export default function TranscriptActionBar({
	onAddTranscript,
	selectedCount,
	onBulkAction,
	searchQuery,
	onSearchChange,
}: TranscriptActionBarProps) {
	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
			<div className="flex flex-col sm:flex-row gap-4 justify-between">
				<div className="flex gap-2">
					<button
						onClick={onAddTranscript}
						className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						+ Add Transcript
					</button>
					{selectedCount > 0 && (
						<div className="flex gap-2">
							<button
								onClick={() => onBulkAction("clean")}
								className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
							>
								Clean Selected ({selectedCount})
							</button>
							<button
								onClick={() => onBulkAction("delete")}
								className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
							>
								Delete Selected
							</button>
						</div>
					)}
				</div>

				<div className="flex gap-2">
					<input
						type="text"
						placeholder="Search transcripts..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64"
					/>
				</div>
			</div>
		</div>
	);
}