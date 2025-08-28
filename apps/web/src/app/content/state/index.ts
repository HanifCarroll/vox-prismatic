// State management exports for content module
export * from './transcript-state';
export * from './insight-state';
export * from './post-state';
export * from './modal-manager';
export * from './content-providers';

// Re-export specific hooks for convenience
export { 
  useTranscriptState,
  type TranscriptState,
  type TranscriptAction 
} from './transcript-state';

export { 
  useInsightState,
  type InsightState,
  type InsightAction 
} from './insight-state';

export { 
  usePostState,
  type PostState,
  type PostAction 
} from './post-state';

export { 
  useModalManager,
  ModalType,
  type ModalState,
  type ModalAction 
} from './modal-manager';

export { 
  ContentProvider,
  useContentContext,
  useActiveContentState,
  useContentOperations,
  withContentState 
} from './content-providers';