import { onMounted, onScopeDispose, ref } from 'vue';
import analytics from '@/lib/telemetry';
import { useRealtimeChannels } from './useRealtimeChannels';

/**
 * Handle project processing lifecycle and realtime updates.
 * @param {Object} options
 * @param {string|number} [options.projectId]
 * @param {import('vue').Ref<Object>} [options.projectState]
 * @param {Object} [options.initialState]
 * @param {string|null} [options.initialState.stage]
 * @param {number|null} [options.initialState.progress]
 * @param {string|null} [options.initialState.step]
 * @param {{ project?: string|null, user?: string|null }} [options.channels]
 * @param {() => void} [options.onReloadRequested]
 * @param {() => void} [options.onSwitchToPosts]
 * @param {(event:any) => void} [options.onPostRegenerated]
 */
export const useProjectProcessingState = (options = {}) => {
  const {
    projectId,
    projectState,
    initialState = {},
    channels = {},
    onReloadRequested,
    onSwitchToPosts,
    onPostRegenerated,
  } = options;

  const progress = ref(initialState.progress ?? 0);
  const processingStep = ref(initialState.step ?? null);
  const processingError = ref(null);
  const currentStage = ref(initialState.stage ?? null);

  const safeProjectId = () => {
    if (projectId != null) {
      return String(projectId);
    }
    const value = projectState?.value?.id;
    return value != null ? String(value) : '';
  };

  const assignProjectState = (patch) => {
    if (!projectState) return;
    const next = { ...(projectState.value ?? {}), ...patch };
    projectState.value = next;
  };

  const handleProgress = (event = {}) => {
    const nextProgress = typeof event.progress === 'number' ? event.progress : progress.value;
    const nextStep = event.step ?? processingStep.value;

    progress.value = nextProgress;
    processingStep.value = nextStep;
    currentStage.value = 'processing';
    processingError.value = null;

    assignProjectState({
      processingProgress: nextProgress,
      processingStep: nextStep,
      currentStage: 'processing',
    });

    if (!window.__vp_processingTracked && (nextProgress ?? 0) > 0) {
      window.__vp_processingTracked = true;
      const step = nextStep || 'queued';
      analytics.capture('app.processing_started', { projectId: safeProjectId(), step });
    }
  };

  const handleCompleted = () => {
    progress.value = 100;
    processingStep.value = 'complete';
    currentStage.value = 'posts';
    processingError.value = null;

    assignProjectState({
      processingProgress: 100,
      processingStep: 'complete',
      currentStage: 'posts',
    });

    analytics.capture('app.processing_completed', { projectId: safeProjectId() });
    window.__vp_trackGeneratedAfterReload = true;

    if (typeof onSwitchToPosts === 'function') {
      onSwitchToPosts();
    }
    if (typeof onReloadRequested === 'function') {
      onReloadRequested();
    }
  };

  const handleFailed = (event = {}) => {
    const message = event.message ?? 'Processing failed.';
    processingError.value = message;
    processingStep.value = event.step ?? message ?? 'processing_failed';
    currentStage.value = 'processing';
    assignProjectState({
      processingStep: processingStep.value,
      currentStage: 'processing',
    });
  };

  const forwardRegenerated = (event) => {
    if (typeof onPostRegenerated === 'function') {
      onPostRegenerated(event);
    }
  };

  const { isRealtimeUnavailable, init, dispose } = useRealtimeChannels({
    projectChannel: channels.project,
    userChannel: channels.user,
    onProgress: handleProgress,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onPostRegenerated: forwardRegenerated,
    onReconnect: () => {
      if (typeof onReloadRequested === 'function') {
        onReloadRequested();
      }
    },
  });

  onMounted(() => {
    init();
  });

  onScopeDispose(() => {
    dispose();
  });

  const syncFromProject = (project = {}) => {
    progress.value = project.processingProgress ?? progress.value ?? 0;
    processingStep.value = project.processingStep ?? processingStep.value ?? null;
    currentStage.value = project.currentStage ?? currentStage.value ?? null;
  };

  const resetProcessingError = () => {
    processingError.value = null;
  };

  return {
    progress,
    processingStep,
    processingError,
    currentStage,
    isRealtimeUnavailable,
    syncFromProject,
    resetProcessingError,
  };
};
