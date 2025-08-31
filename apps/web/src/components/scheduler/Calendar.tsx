
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Platform } from '@/types';
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
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit',
    postId: undefined as string | undefined,
    eventId: undefined as string | undefined,
    initialDateTime: undefined as Date | undefined,
    initialPlatform: undefined as Platform | undefined,
  });
  const [isDragging, setDragging] = useState(false);
  
  // Modal actions
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
      postId: undefined,
      eventId: undefined,
      initialDateTime: undefined,
      initialPlatform: undefined,
    });
  };

  // Render the appropriate view based on current state
  const renderCalendarView = () => {
    const commonProps = {
      isDragging,
      setDragging,
      openScheduleModal
    };
    
    switch (view) {
      case 'day':
        return <DayView {...commonProps} />;
      case 'week':
        return <WeekView {...commonProps} />;
      case 'month':
        return <MonthView {...commonProps} />;
      default:
        return <WeekView {...commonProps} />;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full bg-white">
        {/* Approved Posts Sidebar */}
        <ApprovedPostsSidebar 
          openScheduleModal={openScheduleModal}
          isDragging={isDragging}
          setDragging={setDragging}
        />
        
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