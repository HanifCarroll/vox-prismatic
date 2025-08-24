export type RecordingState = "idle" | "recording" | "paused" | "processing";

export interface Recording {
	id: string;
	filename: string;
	duration: string;
	timestamp: Date;
	status: "local" | "uploaded" | "failed";
}

export interface MeetingState {
	is_in_meeting: boolean;
	detected_app?: string | { Unknown: string };
	started_at?: string;
}

export interface AppState {
	recordingState: RecordingState;
	recordingDuration: number;
	recentRecordings: Recording[];
}