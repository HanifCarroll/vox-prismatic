"use client";

import type { SidebarCounts } from "@/types";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Edit3,
	FileText,
	Home,
	Lightbulb,
	Settings,
	Target,
	Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebarCounts } from "@/app/hooks/useSidebarQueries";
import { RecentlyViewed } from "@/components/RecentlyViewed";

/**
 * Sidebar navigation component
 * Main navigation for the content creation system
 */

interface NavItem {
	id: string;
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string;
	description: string;
	badge?: number;
}

interface NavSection {
	title: string;
	items: NavItem[];
}

interface SidebarProps {
	className?: string;
	initialCounts?: SidebarCounts;
}

export function Sidebar({ className = "", initialCounts }: SidebarProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isOverlay, setIsOverlay] = useState(false);
	const [isTablet, setIsTablet] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Detect screen size for responsive behavior - only after mount
	useEffect(() => {
		setIsMounted(true);
		const checkScreenSize = () => {
			const width = window.innerWidth;
			setIsTablet(width >= 768 && width < 1024);
			
			// Auto-collapse on tablet
			if (width >= 768 && width < 1024) {
				setIsCollapsed(true);
				setIsOverlay(false);
			} else if (width >= 1024) {
				setIsOverlay(false);
			}
		};

		checkScreenSize();
		window.addEventListener('resize', checkScreenSize);
		return () => window.removeEventListener('resize', checkScreenSize);
	}, []);

	// Use React Query for sidebar counts with real-time updates
	const { data: queryCounts, isLoading, error } = useSidebarCounts();
	
	// Use query data if available, otherwise fall back to initial counts
	const counts = queryCounts || initialCounts || { transcripts: 0, insights: 0, posts: 0 };

	const navigationSections: NavSection[] = [
		{
			title: "Overview",
			items: [
				{
					id: "dashboard",
					title: "Dashboard",
					icon: Home,
					href: "/",
					description: "System overview and statistics",
				},
			],
		},
		{
			title: "Content Pipeline",
			items: [
				{
					id: "transcripts",
					title: "Transcripts",
					icon: FileText,
					href: "/content?view=transcripts",
					description: "Manage raw and cleaned transcripts",
					badge: counts.transcripts,
				},
				{
					id: "insights",
					title: "Insights",
					icon: Lightbulb,
					href: "/content?view=insights",
					description: "Review and approve AI insights",
					badge: counts.insights,
				},
				{
					id: "posts",
					title: "Posts",
					icon: Edit3,
					href: "/content?view=posts",
					description: "Manage and edit social media posts",
					badge: counts.posts,
				},
				{
					id: "scheduler",
					title: "Scheduler",
					icon: Calendar,
					href: "/scheduler",
					description: "Visual calendar for post scheduling",
				},
			],
		},
		{
			title: "Configuration",
			items: [
				{
					id: "prompts",
					title: "Prompts",
					icon: Settings,
					href: "/prompts",
					description: "Manage AI prompt templates",
				},
			],
		},
	];

	const isActiveLink = (href: string) => {
		if (href === "/") {
			return pathname === href;
		}
		
		// Handle query parameters for content page
		if (href.startsWith("/content?")) {
			// Extract the view from the href
			const urlParams = new URLSearchParams(href.split("?")[1]);
			const hrefView = urlParams.get("view");
			
			// Check if we're on the content page
			if (pathname === "/content") {
				// Get the current view from browser URL
				const currentView = searchParams.get("view") || "transcripts";
				return currentView === hrefView;
			}
			return false;
		}
		
		return pathname.startsWith(href);
	};

	// Use desktop layout during SSR and initial hydration
	const shouldUseTabletLayout = isMounted && isTablet;

	// Toggle sidebar with overlay behavior on tablets
	const toggleSidebar = () => {
		if (shouldUseTabletLayout) {
			if (isCollapsed) {
				// Opening - show as overlay
				setIsOverlay(true);
				setIsCollapsed(false);
			} else {
				// Closing - collapse back
				setIsOverlay(false);
				setIsCollapsed(true);
			}
		} else {
			// Desktop behavior
			setIsCollapsed(!isCollapsed);
		}
	};

	const getLinkStyles = (href: string) => {
		const baseStyles = isCollapsed && !isOverlay
			? "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group"
			: "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group";

		if (isActiveLink(href)) {
			return `${baseStyles} bg-blue-100 text-blue-700 font-medium`;
		}

		return `${baseStyles} text-gray-700 hover:bg-gray-100 hover:text-gray-900`;
	};

	return (
		<>
			{/* Spacer for tablet fixed sidebar */}
			{shouldUseTabletLayout && (
				<div className="w-20 flex-shrink-0" />
			)}
			
			{/* Backdrop for tablet overlay mode */}
			{shouldUseTabletLayout && (
				<div 
					className={`fixed inset-0 bg-black z-40 lg:hidden transition-opacity duration-300 ${
						isOverlay && !isCollapsed 
							? 'opacity-30 pointer-events-auto' 
							: 'opacity-0 pointer-events-none'
					}`}
					onClick={toggleSidebar}
				/>
			)}
			
			<div
				className={`sidebar bg-white border-r border-gray-200 ${className} ${
					shouldUseTabletLayout
						? 'fixed top-0 h-full z-50 w-64 transition-transform duration-300 ease-in-out'
						: isCollapsed
						? 'w-20 flex-shrink-0 transition-all duration-300'
						: 'w-64 flex-shrink-0 transition-all duration-300'
				}`}
				style={{
					...(shouldUseTabletLayout ? {
						transform: isOverlay && !isCollapsed ? 'translateX(0)' : 'translateX(-184px)',
						left: 0,
						boxShadow: isOverlay && !isCollapsed ? '4px 0 24px rgba(0,0,0,0.1)' : 'none'
					} : {})
				}}
			>
			<div className="flex flex-col h-full">
				{/* Header */}
				<div
					className={`${isCollapsed ? "p-3" : "p-6"} border-b border-gray-200`}
				>
					<div
						className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}
					>
						{!isCollapsed && (
							<div className="flex items-center gap-3">
								<Target className="h-8 w-8 text-blue-600" />
								<div>
									<h1 className="font-bold text-gray-800">Content Creation</h1>
									<p className="text-xs text-gray-500">System v1.0</p>
								</div>
							</div>
						)}
						<button
							onClick={toggleSidebar}
							className={`p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors ${isCollapsed && !isOverlay ? "mx-auto" : ""}`}
							title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
						>
							{isCollapsed ? (
								shouldUseTabletLayout ? (
									<Menu className="h-5 w-5" />
								) : (
									<ChevronRight className="h-5 w-5" />
								)
							) : (
								<ChevronLeft className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 p-4 space-y-6 overflow-y-auto">
					{/* Recently Viewed Section */}
					{(!isTablet || !isCollapsed || isOverlay) && (
						<RecentlyViewed isCollapsed={isCollapsed && !isOverlay} />
					)}
					
					{navigationSections.map((section) => (
						<div key={section.title}>
							{(!isCollapsed || isOverlay) && (
								<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
									{section.title}
								</h3>
							)}

							<div className="space-y-1">
								{section.items.map((item) => (
									<Link
										key={item.id}
										href={item.href}
										className={getLinkStyles(item.href)}
										title={isCollapsed && !isOverlay ? item.title : undefined}
										onClick={() => {
											// Close overlay on tablet after navigation
											if (shouldUseTabletLayout && isOverlay) {
												setIsOverlay(false);
												setIsCollapsed(true);
											}
										}}
									>
										<item.icon
											className={`${isCollapsed && !isOverlay ? "h-5 w-5" : "h-5 w-5"} flex-shrink-0`}
										/>

										{/* Collapsed state: Show full label for both tablet and desktop */}
										{isCollapsed && !isOverlay && (
											<div className="flex flex-col items-center px-1">
												<span className="text-[9px] text-center mt-1 leading-tight break-words">
													{item.title}
												</span>
												{item.badge !== undefined && item.badge > 0 && (
													<span className="text-[9px] text-red-600 font-bold">
														({item.badge})
													</span>
												)}
											</div>
										)}

										{(!isCollapsed || isOverlay) && (
											<>
												<div className="flex-1">
													<div className="font-medium">{item.title}</div>
												</div>

												{item.badge !== undefined && item.badge > 0 && (
													<div className="bg-red-500 text-white text-[10px] min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full font-bold shadow-sm">
														{item.badge > 99 ? "99+" : item.badge}
													</div>
												)}
											</>
										)}
									</Link>
								))}
							</div>
						</div>
					))}
				</nav>
			</div>
		</div>
		</>
	);
}
