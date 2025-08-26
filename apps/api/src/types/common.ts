/**
 * Common shared types across the API
 */

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';