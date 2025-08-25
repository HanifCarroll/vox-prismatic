import type { TranscriptView } from "@content-creation/shared";

export interface FilterTab {
	key: string;
	label: string;
	count: (transcripts: TranscriptView[]) => number;
}

interface TranscriptFilterTabsProps {
	tabs: FilterTab[];
	activeFilter: string;
	onFilterChange: (filterKey: string) => void;
	transcripts: TranscriptView[];
}

export default function TranscriptFilterTabs({
	tabs,
	activeFilter,
	onFilterChange,
	transcripts,
}: TranscriptFilterTabsProps) {
	return (
		<div className="mb-6">
			<div className="border-b border-gray-200">
				<nav className="-mb-px flex space-x-8">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => onFilterChange(tab.key)}
							className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
								activeFilter === tab.key
									? "border-blue-500 text-blue-600"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}`}
						>
							{tab.label}
							<span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
								{tab.count(transcripts)}
							</span>
						</button>
					))}
				</nav>
			</div>
		</div>
	);
}