import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { X } from 'lucide-react';
import './App.css';

interface MeetingState {
  is_in_meeting: boolean;
  detected_app?: string | { Unknown: string };
  started_at?: string;
}

export default function MeetingNotification() {
  const [meetingState, setMeetingState] = useState<MeetingState | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Get the current meeting state when the notification opens
    invoke<MeetingState>('get_meeting_state')
      .then((state) => {
        console.log('Meeting state retrieved:', state);
        console.log('Detected app:', state.detected_app);
        setMeetingState(state);
      })
      .catch((error) => {
        console.error('Failed to get meeting state:', error);
      });
    
    console.log('MeetingNotification component mounted');
  }, []);

  const handleStartRecording = async () => {
    try {
      await invoke('start_recording');
      setIsRecording(true);
      
      // Close window after brief delay to show recording state
      setTimeout(async () => {
        try {
          const window = getCurrentWindow();
          await window.close();
        } catch (error) {
          console.error('Failed to close window:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };


  const getAppName = (detectedApp?: string | { Unknown: string }) => {
    if (!detectedApp) return 'Meeting';
    
    if (typeof detectedApp === 'string') {
      const appNames: Record<string, string> = {
        Zoom: 'Zoom',
        SlackHuddle: 'Slack Huddle',
        GoogleMeet: 'Google Meet',
        MicrosoftTeams: 'Microsoft Teams',
        Discord: 'Discord',
      };
      return appNames[detectedApp] || 'Meeting';
    } else if (detectedApp.Unknown) {
      return detectedApp.Unknown;
    }
    
    return 'Meeting';
  };

  if (!meetingState) {
    return null;
  }

  const appName = getAppName(meetingState.detected_app);

  return (
    <div className="w-full h-full p-3">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 relative">
        {/* Close X button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>

        {/* Meeting info */}
        <div className="mb-4 pr-8">
          <h3 className="text-lg font-medium text-gray-900">Meeting detected</h3>
          <p className="text-sm text-gray-500">{appName}</p>
        </div>

        {/* Action button */}
        <div>
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isRecording}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-lg transition-colors"
          >
            {isRecording ? 'Recording...' : 'Start Recording'}
          </button>
        </div>
      </div>
    </div>
  );
}