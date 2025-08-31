
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useURLView } from './URLStateManager';
import { CalendarHeader } from './CalendarHeader';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { PostModal } from './PostModal';
import { ApprovedPostsSidebar } from './ApprovedPostsSidebar';
import type { Platform } from '@/types';

/**
 * Main Calendar component that renders the appropriate view
 * and provides drag-and-drop functionality
 */
interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  postId?: string;
  eventId?: string;
  initialDateTime?: Date;
  initialPlatform?: Platform;
}

export function Calendar() {
  const { view } = useURLView();
  
  // Local modal state management
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const openScheduleModal = (params: {
    postId?: string;
    eventId?: string;
    dateTime?: Date;
    platform?: Platform;
    mode?: 'create' | 'edit';
  }) => {
    setModalState({
      isOpen: true,
      mode: params.mode || 'create',
      postId: params.postId,
      eventId: params.eventId,
      initialDateTime: params.dateTime,
      initialPlatform: params.platform,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
    });
  };

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
        <ApprovedPostsSidebar openScheduleModal={openScheduleModal} />
        
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
        {modalState.isOpen && (
          <PostModal 
            modalState={modalState}
            closeModal={closeModal}
          />
        )}
      </div>
    </DndProvider>
  );
}