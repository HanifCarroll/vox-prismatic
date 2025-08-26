/**
 * AI Service Type Definitions
 * Local types for the AI service within the API project
 */

// Result pattern for functional error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Post Type enum
export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

// AI Configuration
export interface AIConfig {
  apiKey: string;
  flashModel: string;
  proModel: string;
}

// Insight type for AI processing
export interface Insight {
  title: string;
  quote: string;
  summary: string;
  category: string;
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  postType: PostType;
}

// Generated post structure from AI
export interface GeneratedPost {
  linkedinPost: {
    hook: string;
    body: string;
    cta: string;
    full: string;
  };
  xPost: {
    hook: string;
    body: string;
    cta: string;
    full: string;
  };
}

// Database operation types (re-exported from database package)
export type {
  CreateTranscriptData,
  CreateInsightData,
  CreatePostData
} from '../repositories';