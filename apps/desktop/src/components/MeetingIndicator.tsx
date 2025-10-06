import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';
import type { MeetingState } from '../types';

export function MeetingIndicator() {
  const [meetingState, setMeetingState] = useState<MeetingState>({
    is_in_meeting: false,
  });

  useEffect(() => {
    // Note: Meeting detection is started automatically by the backend during app setup
    
    // Poll for meeting state every 3 seconds
    const interval = setInterval(async () => {
      try {
        const state = await invoke<MeetingState>('get_meeting_state');
        setMeetingState(state);
      } catch (error) {
        console.error('Failed to get meeting state:', error);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      // Optionally stop detection when component unmounts
      // invoke('stop_meeting_detection').catch(console.error);
    };
  }, []);

  if (!meetingState.is_in_meeting) {
    return null;
  }

  const appNames: Record<string, string> = {
    Zoom: 'Zoom',
    SlackHuddle: 'Slack Huddle',
    GoogleMeet: 'Google Meet',
    MicrosoftTeams: 'Microsoft Teams',
    Discord: 'Discord',
  };

  const getAppName = (detectedApp?: string | { Unknown: string }): string => {
    if (!detectedApp) return 'Meeting';
    
    if (typeof detectedApp === 'string') {
      return appNames[detectedApp] || 'Meeting';
    } else {
      // detectedApp is { Unknown: string }
      return detectedApp.Unknown || 'Meeting';
    }
  };

  const appName = getAppName(meetingState.detected_app);

  return (
    <Badge 
      variant="default" 
      className="bg-green-500/10 text-green-600 border-green-500/20 animate-pulse"
    >
      <Circle className="w-2 h-2 mr-1.5 fill-current" />
      {appName} Active
    </Badge>
  );
}