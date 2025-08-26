import React from 'react';
import type { TranscriptView } from "@/types/database";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export interface FilterTab {
	key: string;
	label: string;
	count: (transcripts: TranscriptView[]) => number;
}

interface TranscriptFilterTabsProps {
	tabs: FilterTab[];
	transcripts: TranscriptView[];
	activeFilter: string;
	onFilterChange: (filterKey: string) => void;
}

function TranscriptFilterTabs({
	tabs,
	transcripts,
	activeFilter,
	onFilterChange,
}: TranscriptFilterTabsProps) {
	return (
		<div className="mb-6">
			<Tabs value={activeFilter} onValueChange={onFilterChange}>
				<TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/30 rounded-lg border border-border">
					{tabs.map((tab) => (
						<TabsTrigger 
							key={tab.key} 
							value={tab.key}
							className="flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-md font-medium text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border hover:bg-background/50 hover:text-foreground/80"
						>
							{tab.label}
							<Badge 
								variant={activeFilter === tab.key ? "default" : "secondary"} 
								className={`text-xs font-semibold ${
									activeFilter === tab.key 
										? "bg-primary/10 text-primary border-primary/20" 
										: "bg-muted text-muted-foreground"
								}`}
							>
								{tab.count(transcripts)}
							</Badge>
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	);
}

export default React.memo(TranscriptFilterTabs);