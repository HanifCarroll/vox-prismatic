'use client';

import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSchedulerModalState } from '../store/scheduler-store';
import { useURLView } from './URLStateManager';
import { CalendarHeader } from './CalendarHeader';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { PostModal } from './PostModal';
import { ApprovedPostsSidebar } from './ApprovedPostsSidebar';

/**
 * Main Calendar component that renders the appropriate view
 * and provides drag-and-drop functionality
 */
export function Calendar() {
  const { view } = useURLView();
  const modalState = useSchedulerModalState();

  // Render the appropriate view based on current state
  const renderCalendarView = () => {
    switch (view) {
      case 'day':
        return <DayView />;
      case 'week':
        return <WeekView />;
      case 'month':
        return <MonthView />;
      default:
        return <WeekView />;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full bg-white">
        {/* Approved Posts Sidebar */}
        <ApprovedPostsSidebar />
        
        {/* Main Calendar Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Calendar Header */}
          <CalendarHeader />
          
          {/* Calendar Content - Scrollable */}
          <div className="flex-1 overflow-auto">
            <div className="h-full overflow-auto transition-all duration-300 ease-in-out">
              {renderCalendarView()}
            </div>
          </div>
        </div>

        {/* Post Scheduling Modal */}
        {modalState.isOpen && <PostModal />}
      </div>
    </DndProvider>
  );
}