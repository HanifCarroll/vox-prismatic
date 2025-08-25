import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Sparkles, Search } from 'lucide-react';

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

				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search transcripts..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-10 min-w-64"
					/>
				</div>
			</div>
		</Card>
	);
}

export default React.memo(TranscriptActionBar);