import { Response } from 'express';

/**
 * SSE Connection Interface
 * Represents an active Server-Sent Events connection
 */
export interface SSEConnection {
  id: string;
  response: Response;
  userId?: string;
  jobId?: string;
  createdAt: Date;
  lastEventId?: string;
}

/**
 * SSE Message Format
 */
export interface SSEMessage {
  id?: string;
  event?: string;
  data: any;
  retry?: number;
}