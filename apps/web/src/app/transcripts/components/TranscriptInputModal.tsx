"use client";

import { useRef, useState } from "react";
import { Clipboard, Upload, X, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
	return (
		<textarea
			className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
			{...props}
		/>
	);
};

interface TranscriptInputModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: {
		title: string;
		content: string;
		fileName?: string;
	}) => void;
}

export default function TranscriptInputModal({
	isOpen,
	onClose,
	onSubmit,
}: TranscriptInputModalProps) {
	const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
	const [formData, setFormData] = useState({
		title: "",
		content: "",
	});
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsProcessing(true);

		try {
			let content = formData.content;
			let fileName = undefined;
			let title = formData.title.trim();

			// If upload tab is active and file is selected, read the file
			if (activeTab === "upload" && selectedFile) {
				content = await readFileContent(selectedFile);
				fileName = selectedFile.name;

				// Auto-generate title from filename if not provided
				if (!title) {
					title = selectedFile.name.replace(/\.[^/.]+$/, "");
				}
			}

			if (!content || !content.trim()) {
				alert("Please provide transcript content");
				setIsProcessing(false);
				return;
			}

			// Use filename as title if still empty (for paste mode)
			if (!title) {
				title = "Untitled Transcript";
			}

			onSubmit({
				title,
				content: content.trim(),
				fileName,
			});

			// Reset form
			setFormData({ title: "", content: "" });
			setSelectedFile(null);
			setActiveTab("paste");
		} finally {
			setIsProcessing(false);
		}
	};

	const readFileContent = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				resolve(content);
			};
			reader.onerror = reject;
			reader.readAsText(file);
		});
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Only accept text files
			if (!file.type.startsWith("text/") && !file.name.endsWith(".txt")) {
				alert("Please select a text file (.txt)");
				return;
			}
			setSelectedFile(file);

			// Auto-fill title from filename if empty
			if (!formData.title) {
				setFormData((prev) => ({
					...prev,
					title: file.name.replace(/\.[^/.]+$/, ""),
				}));
			}
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		const file = e.dataTransfer.files[0];
		if (file && (file.type.startsWith("text/") || file.name.endsWith(".txt"))) {
			setSelectedFile(file);
			setActiveTab("upload");

			// Auto-fill title from filename if empty
			if (!formData.title) {
				setFormData((prev) => ({
					...prev,
					title: file.name.replace(/\.[^/.]+$/, ""),
				}));
			}
		} else if (file) {
			alert("Please drop a text file (.txt)");
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
				<div className="p-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-gray-900">
							Add Transcript
						</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex flex-col h-full max-h-[calc(90vh-2rem)]"
				>
					{/* Tab Navigation */}
					<div className="flex px-6 mb-4">
						<button
							type="button"
							onClick={() => setActiveTab("paste")}
							className={`px-4 py-3 font-medium text-sm transition-colors rounded-lg ${
								activeTab === "paste"
									? "text-blue-600 bg-blue-50"
									: "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
							}`}
						>
							<Clipboard className="h-4 w-4 mr-2" />
							Paste Text
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("upload")}
							className={`ml-2 px-4 py-3 font-medium text-sm transition-colors rounded-lg ${
								activeTab === "upload"
									? "text-blue-600 bg-blue-50"
									: "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
							}`}
						>
							<Upload className="h-4 w-4 mr-2" />
							Upload File
						</button>
					</div>

					<div className="px-6 overflow-y-auto flex-1 flex flex-col">
						{/* Content Input Area - fixed height for consistency */}
						<div
							className="h-64 flex flex-col relative"
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							onDragEnter={handleDragEnter}
							onDragLeave={handleDragLeave}
						>
							{activeTab === "paste" ? (
								<div className="flex flex-col h-full">
									<label
										htmlFor="content"
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Transcript Content *
									</label>
									<textarea
										id="content"
										required={activeTab === "paste"}
										value={formData.content}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												content: e.target.value,
											}))
										}
										className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
										placeholder="Paste your transcript content here..."
									/>
								</div>
							) : (
								<div className="flex flex-col h-full">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Upload File *
									</label>
									<div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors flex flex-col items-center justify-center min-h-0">
										<input
											ref={fileInputRef}
											type="file"
											accept=".txt,text/plain"
											onChange={handleFileSelect}
											className="hidden"
										/>
										{selectedFile ? (
											<div className="space-y-6">
												<div className="flex items-center justify-center">
													<svg
														className="w-16 h-16 text-blue-500"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
														/>
													</svg>
												</div>
												<div>
													<p className="text-lg font-medium text-gray-900">
														{selectedFile.name}
													</p>
													<p className="text-sm text-gray-500 mt-1">
														{(selectedFile.size / 1024).toFixed(2)} KB
													</p>
												</div>
												<button
													type="button"
													onClick={() => setSelectedFile(null)}
													className="text-sm text-red-600 hover:text-red-700 font-medium"
												>
													Remove file
												</button>
											</div>
										) : (
											<div className="space-y-6">
												<svg
													className="mx-auto w-16 h-16 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
													/>
												</svg>
												<div>
													<button
														type="button"
														onClick={() => fileInputRef.current?.click()}
														className="text-blue-600 hover:text-blue-700 font-medium text-lg"
													>
														Choose a file
													</button>
													<p className="text-gray-500 mt-2">
														{" "}
														or drag and drop
													</p>
												</div>
												<p className="text-sm text-gray-500">
													Text files only (.txt)
												</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Drag overlay */}
							{dragActive && (
								<div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
									<div className="text-center">
										<svg
											className="mx-auto w-12 h-12 text-blue-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
											/>
										</svg>
										<p className="mt-2 text-blue-600 font-medium">
											Drop your file here
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Title field - fixed at bottom */}
						<div className="pt-4">
							<label
								htmlFor="title"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Title (optional - will be auto-generated if blank)
							</label>
							<input
								type="text"
								id="title"
								value={formData.title}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, title: e.target.value }))
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Enter transcript title or leave blank for auto-generation..."
							/>
						</div>
					</div>

					{/* Modal Footer */}
					<div className="sticky bottom-0 bg-white px-6 py-4 flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors font-medium"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								isProcessing ||
								(activeTab === "paste"
									? !formData.content.trim()
									: !selectedFile)
							}
							className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
						>
							{isProcessing ? (
								<>
									<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Processing...
								</>
							) : (
								"Add Transcript"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}