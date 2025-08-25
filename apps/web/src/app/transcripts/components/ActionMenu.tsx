"use client";

import { useRef, useEffect } from "react";

export interface MenuAction {
	id: string;
	label: string;
	onClick?: () => void;
	disabled?: boolean;
	primary?: boolean;
	danger?: boolean;
}

interface ActionMenuProps {
	isOpen: boolean;
	onClose: () => void;
	actions: MenuAction[];
	className?: string;
}

export default function ActionMenu({
	isOpen,
	onClose,
	actions,
	className = "",
}: ActionMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	// Close menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			ref={menuRef}
			className={`absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 ${className}`}
		>
			{actions.map((action, index) => (
				<div key={action.id}>
					{index > 0 && action.primary && (
						<div className="border-t border-gray-100 my-1"></div>
					)}
					{index === actions.length - 1 && action.danger && (
						<div className="border-t border-gray-100 my-1"></div>
					)}
					<button
						onClick={() => {
							if (!action.disabled && action.onClick) {
								action.onClick();
							}
							onClose();
						}}
						disabled={action.disabled}
						className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
							action.danger
								? "text-red-600 hover:bg-red-50"
								: "text-gray-700"
						} ${action.primary ? "font-medium" : ""}`}
					>
						{action.label}
					</button>
				</div>
			))}
		</div>
	);
}