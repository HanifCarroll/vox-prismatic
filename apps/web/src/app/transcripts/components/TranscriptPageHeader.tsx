import React from 'react';

interface TranscriptPageHeaderProps {
	title: string;
	description: string;
}

/**
 * Unified page header for Transcripts page
 * Matches the design pattern established by Prompts page
 */
function TranscriptPageHeader({
	title,
	description,
}: TranscriptPageHeaderProps) {
	return (
		<div className="mb-10">
			<h1 className="text-4xl font-bold text-gray-900 mb-3">{title}</h1>
			<p className="text-gray-600 text-lg">{description}</p>
		</div>
	);
}

export default React.memo(TranscriptPageHeader);