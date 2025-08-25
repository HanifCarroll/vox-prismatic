interface TranscriptPageHeaderProps {
	title: string;
	description: string;
}

export default function TranscriptPageHeader({
	title,
	description,
}: TranscriptPageHeaderProps) {
	return (
		<div className="mb-6">
			<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
			<p className="mt-2 text-gray-600">{description}</p>
		</div>
	);
}