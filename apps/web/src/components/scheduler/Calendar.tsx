
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useURLView } from './URLStateManager';
import { CalendarHeader } from './CalendarHeader';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { ApprovedPostsSidebar } from './ApprovedPostsSidebar';

/**
 * Main Calendar component that renders the appropriate view
 * and provides drag-and-drop functionality
 */
export function Calendar() {
  const { view } = useURLView();
  const [isDragging, setDragging] = useState(false);

  // Render the appropriate view based on current state
  const renderCalendarView = () => {
    const commonProps = {
      isDragging,
      setDragging
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

        {/* Modals are now managed globally via ModalManager */}
      </div>
    </DndProvider>
  );
}