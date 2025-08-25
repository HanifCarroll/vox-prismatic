'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarProvider } from './components/CalendarContext';
import { Calendar } from './components/Calendar';

/**
 * Scheduler Page - Post scheduling interface with drag-and-drop calendar
 * Features full calendar views (day, week, month) with drag-and-drop functionality
 */

export default function SchedulerPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/posts">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Posts
              </Button>
            </Link>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Post Scheduler</h1>
              <p className="text-sm text-gray-600">
                Drag and drop to schedule posts across platforms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Interface */}
      <div className="flex-1 overflow-hidden">
        <CalendarProvider initialView="week">
          <Calendar />
        </CalendarProvider>
      </div>
    </div>
  );
}