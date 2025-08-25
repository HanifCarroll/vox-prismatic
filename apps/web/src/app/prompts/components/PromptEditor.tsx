"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	AlertCircle,
	ArrowLeft,
	Check,
	FileText,
	Save,
	Variable,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PromptData {
	name: string;
	content: string;
	variables: string[];
	title: string;
	description: string;
}

interface PromptEditorProps {
	promptName: string;
	onBack: () => void;
	onUpdate: () => void;
}

export function PromptEditor({
	promptName,
	onBack,
	onUpdate,
}: PromptEditorProps) {
	const [promptData, setPromptData] = useState<PromptData | null>(null);
	const [editedContent, setEditedContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchPromptContent();
	}, [promptName]);

	useEffect(() => {
		if (promptData) {
			setHasChanges(editedContent !== promptData.content);
		}
	}, [editedContent, promptData]);

	const fetchPromptContent = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/prompts/${promptName}`);
			const result = await response.json();
			if (result.success) {
				setPromptData(result.data);
				setEditedContent(result.data.content);
			} else {
				setError(result.error || "Failed to load prompt");
			}
		} catch (error) {
			setError("Failed to fetch prompt content");
			console.error("Failed to fetch prompt:", error);
		} finally {
			setLoading(false);
		}
	};

	const extractVariables = useCallback((content: string): string[] => {
		const matches = content.match(/{{(\w+)}}/g);
		if (!matches) return [];
		return [...new Set(matches.map((match) => match.replace(/[{}]/g, "")))];
	}, []);

	const handleSave = async () => {
		if (!hasChanges) return;

		try {
			setSaving(true);
			setError(null);

			const response = await fetch(`/api/prompts/${promptName}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ content: editedContent }),
			});

			const result = await response.json();

			if (result.success) {
				setSaveSuccess(true);
				setHasChanges(false);
				if (promptData) {
					setPromptData({
						...promptData,
						content: editedContent,
						variables: extractVariables(editedContent),
					});
				}
				setTimeout(() => setSaveSuccess(false), 3000);
				onUpdate();
			} else {
				setError(result.error || "Failed to save prompt");
			}
		} catch (error) {
			setError("Failed to save prompt");
			console.error("Failed to save prompt:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (hasChanges) {
			const confirmed = confirm(
				"You have unsaved changes. Are you sure you want to leave?",
			);
			if (!confirmed) return;
		}
		onBack();
	};

	const currentVariables = extractVariables(editedContent);
	const addedVariables = currentVariables.filter(
		(v) => !promptData?.variables.includes(v),
	);
	const removedVariables =
		promptData?.variables.filter((v) => !currentVariables.includes(v)) || [];

	if (loading) {
		return (
			<div className="container mx-auto py-8 px-4">
				<div className="flex items-center justify-center h-64">
					<div className="text-gray-500">Loading prompt...</div>
				</div>
			</div>
		);
	}

	if (error && !promptData) {
		return (
			<div className="container mx-auto py-8 px-4">
				<div className="flex flex-col items-center justify-center h-64">
					<AlertCircle className="h-12 w-12 text-red-500 mb-4" />
					<div className="text-red-600">{error}</div>
					<Button onClick={onBack} className="mt-4">
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-4 max-w-6xl">
			<div className="mb-6">
				<Button variant="ghost" onClick={handleCancel} className="mb-4">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Prompts
				</Button>

				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							{promptData?.title || promptName}
						</h1>
						<p className="text-gray-600">
							{promptData?.description || "Edit the prompt template below"}
						</p>
					</div>

					<div className="flex gap-2">
						<Button variant="outline" onClick={handleCancel} disabled={saving}>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							disabled={!hasChanges || saving}
							className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
						>
							{saveSuccess ? (
								<>
									<Check className="h-4 w-4 mr-2" />
									Saved
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									{saving ? "Saving..." : "Save Changes"}
								</>
							)}
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
					<AlertCircle className="h-5 w-5" />
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<div className="lg:col-span-3">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Prompt Content
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="relative">
								<textarea
									value={editedContent}
									onChange={(e) => setEditedContent(e.target.value)}
									className="w-full h-[600px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
									placeholder="Enter your prompt template here..."
									spellCheck={false}
								/>
								{hasChanges && (
									<div className="absolute top-2 right-2">
										<Badge
											variant="secondary"
											className="bg-yellow-100 text-yellow-800"
										>
											Unsaved changes
										</Badge>
									</div>
								)}
							</div>

							<div className="mt-4 p-4 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600">
									<strong>Tip:</strong> Use {`{{VARIABLE_NAME}}`} syntax to
									create template variables. These will be replaced with actual
									values when the prompt is used.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="lg:col-span-1">
					<Card className="sticky top-4">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Variable className="h-5 w-5" />
								Variables
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{currentVariables.length === 0 ? (
									<p className="text-sm text-gray-500">
										No variables detected in the template
									</p>
								) : (
									<>
										<div>
											<h4 className="text-sm font-medium mb-2">
												Current Variables
											</h4>
											<div className="flex flex-wrap gap-2">
												{currentVariables.map((variable) => (
													<Badge
														key={variable}
														variant={
															addedVariables.includes(variable)
																? "default"
																: "secondary"
														}
														className={
															addedVariables.includes(variable)
																? "bg-green-100 text-green-800"
																: ""
														}
													>
														{`{{${variable}}}`}
													</Badge>
												))}
											</div>
										</div>

										{removedVariables.length > 0 && (
											<div>
												<h4 className="text-sm font-medium mb-2 text-red-600">
													Removed Variables
												</h4>
												<div className="flex flex-wrap gap-2">
													{removedVariables.map((variable) => (
														<Badge
															key={variable}
															variant="destructive"
															className="bg-red-100 text-red-800"
														>
															{`{{${variable}}}`}
														</Badge>
													))}
												</div>
												<p className="text-xs text-red-600 mt-2">
													These variables were removed and may break existing
													workflows
												</p>
											</div>
										)}
									</>
								)}

								<div className="pt-4 border-t">
									<h4 className="text-sm font-medium mb-2">Common Variables</h4>
									<div className="space-y-1 text-xs text-gray-600">
										<div>
											<code className="bg-gray-100 px-1 rounded">
												TRANSCRIPT_CONTENT
											</code>{" "}
											- Raw transcript text
										</div>
										<div>
											<code className="bg-gray-100 px-1 rounded">
												INSIGHT_TITLE
											</code>{" "}
											- Title of the insight
										</div>
										<div>
											<code className="bg-gray-100 px-1 rounded">
												POST_TYPE
											</code>{" "}
											- Type of post
										</div>
										<div>
											<code className="bg-gray-100 px-1 rounded">SUMMARY</code>{" "}
											- Content summary
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
