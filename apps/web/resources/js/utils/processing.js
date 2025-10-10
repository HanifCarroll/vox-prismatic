export const PROCESSING_STEP_LABELS = {
  queued: 'Processing transcript…',
  processing: 'Processing transcript…',
  cleaning: 'Processing transcript…',
  insights: 'Extracting insights…',
  posts: 'Generating posts…',
  ready: 'Ready for review',
  complete: 'Processing complete',
  completed: 'Processing complete',
  error: 'Processing failed',
};

export const formatProcessingStep = (step) => {
  if (!step) return null;
  const normalized = String(step).trim().toLowerCase();
  if (normalized in PROCESSING_STEP_LABELS) {
    return PROCESSING_STEP_LABELS[normalized];
  }

  const cleaned = String(step).replaceAll('_', ' ').trim();
  if (cleaned === '') {
    return null;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};
