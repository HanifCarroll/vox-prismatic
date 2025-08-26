import { Button } from "@/components/ui/button";
import type { CalendarEvent, PostView, ApiResponse } from "@/types/database";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Calendar } from "./components/Calendar";
import { CalendarProvider } from "./components/CalendarContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
      fetch(`${API_BASE_URL}/api/posts?status=approved`, {
        next: { revalidate: 60 }, // Revalidate approved posts every minute
      }),
    ]);

    if (!eventsResponse.ok || !postsResponse.ok) {
      throw new Error('Failed to fetch scheduler data');
    }

    const eventsData: ApiResponse<CalendarEvent[]> = await eventsResponse.json();
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

export default async function SchedulerPage() {
  const { events, approvedPosts } = await getSchedulerData();

  return (
    <CalendarProvider initialEvents={events} initialApprovedPosts={approvedPosts}>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center space-x-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </Button>
              <div className="h-4 w-px bg-border" />
              <div>
                <h1 className="font-semibold">Post Scheduler</h1>
                <p className="text-xs text-muted-foreground">
                  Schedule and manage your content calendar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <Calendar />
      </div>
    </CalendarProvider>
  );
}