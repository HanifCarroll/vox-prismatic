import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Sparkles, Search, X } from 'lucide-react';

interface TranscriptActionBarProps {
	onAddTranscript: () => void;
	selectedCount: number;
	onBulkAction: (action: string) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
}

function TranscriptActionBar({
	onAddTranscript,
	selectedCount,
	onBulkAction,
	searchQuery,
	onSearchChange,
}: TranscriptActionBarProps) {
	return (
		<Card className="p-4 mb-6">
			<div className="flex flex-col sm:flex-row gap-4 justify-between">
				<div className="flex gap-2">
					<Button onClick={onAddTranscript} className="gap-2">
						<Plus className="h-4 w-4" />
						Add Transcript
					</Button>
					{selectedCount > 0 && (
						<div className="flex gap-2">
							<Button
								onClick={() => onBulkAction("clean")}
								variant="secondary"
								size="sm"
								className="gap-2"
							>
								<Sparkles className="h-4 w-4" />
								Clean Selected ({selectedCount})
							</Button>
							<Button
								onClick={() => onBulkAction("delete")}
								variant="destructive"
								size="sm"
								className="gap-2"
							>
								<Trash2 className="h-4 w-4" />
								Delete Selected
							</Button>
						</div>
					)}
				</div>

				<div className="relative max-w-lg">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<Search className="h-5 w-5 text-gray-400" />
					</div>
					<Input
						type="text"
						placeholder="Search by title or content..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-10 pr-4 py-2.5 w-full min-w-[280px] border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg shadow-sm text-sm placeholder:text-gray-400"
					/>
					{searchQuery && (
						<button
							onClick={() => onSearchChange('')}
							className="absolute inset-y-0 right-0 pr-3 flex items-center"
						>
							<X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
						</button>
					)}
				</div>
			</div>
		</Card>
	);
}

export default React.memo(TranscriptActionBar);