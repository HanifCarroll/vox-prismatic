import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	type?: "warning" | "danger" | "info";
}

export function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	type = "warning"
}: ConfirmDialogProps) {
	const dialogRef = useRef<HTMLDivElement>(null);

	// Handle escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onCancel();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			// Focus the dialog for accessibility
			dialogRef.current?.focus();
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	const getTypeStyles = () => {
		switch (type) {
			case "danger":
				return {
					icon: "🗑️",
					iconBg: "bg-red-100",
					iconColor: "text-red-600",
					confirmBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
				};
			case "warning":
				return {
					icon: "⚠️",
					iconBg: "bg-amber-100",
					iconColor: "text-amber-600",
					confirmBg: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
				};
			case "info":
				return {
					icon: "ℹ️",
					iconBg: "bg-blue-100",
					iconColor: "text-blue-600",
					confirmBg: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
				};
		}
	};

	const typeStyles = getTypeStyles();

	return (
		<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-200">
			<div
				ref={dialogRef}
				tabIndex={-1}
				className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.25)] border border-gray-200/50 p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 fade-in-0 duration-200"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
				aria-describedby="dialog-description"
			>
				{/* Icon */}
				<div className="flex items-center justify-center mb-4">
					<div className={`w-12 h-12 rounded-full ${typeStyles.iconBg} flex items-center justify-center`}>
						<span className="text-xl">{typeStyles.icon}</span>
					</div>
				</div>

				{/* Title */}
				<h3
					id="dialog-title"
					className="text-lg font-medium text-gray-900 text-center mb-2"
				>
					{title}
				</h3>

				{/* Message */}
				<p
					id="dialog-description"
					className="text-sm text-gray-600 text-center mb-6 leading-relaxed"
				>
					{message}
				</p>

				{/* Actions */}
				<div className="flex space-x-3">
					<button
						onClick={onCancel}
						className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						className={`flex-1 px-4 py-2.5 text-sm font-medium text-white ${typeStyles.confirmBg} rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 ${typeStyles.confirmBg.split(' ')[2]} focus:ring-offset-2`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}