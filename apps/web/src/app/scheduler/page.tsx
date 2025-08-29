import { getApiBaseUrl } from "@/lib/api-config";
import type { ApiResponse, CalendarEvent, PostView } from "@/types/database";
import { CalendarClientWrapper } from "./components/CalendarClientWrapper";
import { SchedulerHydration } from "./store/hydration";
import { PageHeader } from "@/components/PageHeader";
import { SchedulerStatsWrapper } from "./components/SchedulerStatsWrapper";

export const dynamic = 'force-dynamic';

const API_BASE_URL = getApiBaseUrl();

/**
 * Scheduler Page - Post scheduling interface with drag-and-drop calendar
 * Features full calendar views (day, week, month) with drag-and-drop functionality
 * Now loads data from API server for better performance
 */

interface SchedulerData {
	events: CalendarEvent[];
	approvedPosts: PostView[];
}

async function getSchedulerData(): Promise<SchedulerData> {
	try {
		// Fetch calendar events and approved posts in parallel
		const [eventsResponse, postsResponse] = await Promise.all([
			fetch(`${API_BASE_URL}/api/scheduler/events`, {
				next: { revalidate: 30 }, // Revalidate every 30 seconds for scheduler data
			}),
			fetch(`${API_BASE_URL}/api/posts?status=approved&limit=100`, {
				next: { revalidate: 60 }, // Revalidate approved posts every minute
			}),
		]);

		if (!eventsResponse.ok || !postsResponse.ok) {
			throw new Error("Failed to fetch scheduler data");
		}

		const eventsData: ApiResponse<CalendarEvent[]> =
			await eventsResponse.json();
		const postsData: ApiResponse<PostView[]> = await postsResponse.json();

		return {
			events: eventsData.success ? eventsData.data || [] : [],
			approvedPosts: postsData.success ? postsData.data || [] : [],
		};
	} catch (error) {
		console.error("Failed to load scheduler data:", error);
		return { events: [], approvedPosts: [] };
	}
}

interface SchedulerPageProps {
	searchParams: Promise<{
		// URL state for shareable calendar views
		view?: 'day' | 'week' | 'month';
		date?: string; // ISO date string
		platforms?: string; // comma-separated platform list
		status?: string; // event status filter
		postId?: string; // preselected post ID
	}>;
}

export default async function SchedulerPage({
	searchParams,
}: SchedulerPageProps) {
	const { events, approvedPosts } = await getSchedulerData();
	const params = await searchParams;

	return (
		<SchedulerHydration
			initialEvents={events}
			initialPosts={approvedPosts}
			preselectedPostId={params.postId}
		>
			<div className="h-full flex flex-col bg-gray-50 overflow-hidden">
				<div className="container mx-auto py-3 px-4 max-w-7xl flex flex-col flex-1 min-h-0">
					{/* Use SchedulerStatsWrapper to handle client-side statistics */}
					<SchedulerStatsWrapper />

					{/* Calendar with URL state management */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0">
						<CalendarClientWrapper 
							initialView={params.view || 'week'}
							initialDate={params.date ? new Date(params.date) : new Date()}
							initialFilters={{
								platforms: params.platforms?.split(',').filter(Boolean),
								status: params.status || 'all'
							}}
						/>
					</div>
				</div>
			</div>
		</SchedulerHydration>
	);
}
