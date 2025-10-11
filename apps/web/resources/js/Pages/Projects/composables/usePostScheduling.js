import { computed, onScopeDispose, ref, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import analytics from '@/lib/telemetry';
import { currentTimePlusMinutes, formatForDateTimeLocal, localInputToUtcIso } from '@/utils/timezone';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';

/**
 * Manage scheduling dialog state, validation, and mutations for a single post.
 * @param {Object} options
 * @param {import('vue').Ref<Object|null>} options.currentPost
 * @param {import('vue').Ref<Object>} options.preferencesRef
 * @param {() => string|null} options.getCsrfToken
 * @param {() => void} options.reloadPosts
 * @param {(type:'success'|'error'|'warn', message:string)=>void} options.pushNotification
 * @param {string|number} options.projectId
 */
export const usePostScheduling = ({
  currentPost,
  preferencesRef,
  getCsrfToken,
  reloadPosts,
  pushNotification,
  projectId,
}) => {
  const showSchedule = ref(false);
  const scheduleDate = ref('');
  const scheduleError = ref('');
  const isScheduling = ref(false);
  const isUnscheduling = ref(false);
  const isAutoScheduling = ref(false);
  const minScheduleTime = ref('');

  let minScheduleTimer = null;

  const userTimezone = computed(() => preferencesRef?.value?.timezone ?? 'UTC');
  const userLeadTimeMinutes = computed(() => preferencesRef?.value?.leadTimeMinutes ?? 30);

  const refreshMinScheduleTime = () => {
    minScheduleTime.value = currentTimePlusMinutes(userLeadTimeMinutes.value, userTimezone.value);
  };

  watch([userLeadTimeMinutes, userTimezone], () => {
    refreshMinScheduleTime();
  }, { immediate: true });

  const earliestScheduleSummary = computed(() => {
    if (!minScheduleTime.value) {
      return '';
    }
    const iso = localInputToUtcIso(minScheduleTime.value, userTimezone.value);
    const absolute = formatDateTime(iso);
    const relative = formatRelativeTime(iso);
    return relative ? `${absolute} (${relative})` : absolute;
  });

  const humanLeadRequirement = computed(() => {
    const lead = userLeadTimeMinutes.value;
    if (lead <= 0) return 'Schedule any time in the future.';
    return `Schedule at least ${lead} minute${lead === 1 ? '' : 's'} ahead.`;
  });

  const scheduleHelperText = computed(() => {
    const earliest = earliestScheduleSummary.value;
    if (!earliest) {
      return humanLeadRequirement.value;
    }
    return `${humanLeadRequirement.value} Earliest available: ${earliest}.`;
  });

  const validateScheduleDate = (value) => {
    if (!value) {
      return 'Choose a date and time.';
    }
    try {
      const tz = userTimezone.value;
      const selectedIso = localInputToUtcIso(value, tz);
      const selectedMs = Date.parse(selectedIso);
      if (Number.isNaN(selectedMs)) {
        return 'Enter a valid date and time.';
      }
      const nowMs = Date.now();
      if (selectedMs <= nowMs) {
        return 'Scheduled time must be in the future.';
      }
      if (minScheduleTime.value) {
        const minIso = localInputToUtcIso(minScheduleTime.value, tz);
        const minMs = Date.parse(minIso);
        if (!Number.isNaN(minMs) && selectedMs < minMs) {
          return humanLeadRequirement.value;
        }
      }
      return '';
    } catch (error) {
      return 'Enter a valid date and time.';
    }
  };

  const applyMinimumScheduleTime = () => {
    refreshMinScheduleTime();
    if (!minScheduleTime.value) {
      return;
    }
    scheduleDate.value = minScheduleTime.value;
    scheduleError.value = validateScheduleDate(scheduleDate.value);
  };

  const openScheduleDialog = () => {
    const tz = userTimezone.value;
    refreshMinScheduleTime();
    if (currentPost.value?.scheduledAt) {
      scheduleDate.value = formatForDateTimeLocal(currentPost.value.scheduledAt, tz);
    } else {
      scheduleDate.value = minScheduleTime.value;
    }
    scheduleError.value = scheduleDate.value ? validateScheduleDate(scheduleDate.value) : '';
    showSchedule.value = true;
  };

  const updateScheduleVisibility = (visible) => {
    showSchedule.value = visible;
  };

  const updateScheduleDate = (value) => {
    scheduleDate.value = value;
  };

  watch(scheduleDate, (value) => {
    if (!showSchedule.value) {
      return;
    }
    scheduleError.value = validateScheduleDate(value);
  });

  const stopTimer = () => {
    if (minScheduleTimer) {
      clearInterval(minScheduleTimer);
      minScheduleTimer = null;
    }
  };

  watch(showSchedule, (isOpen) => {
    if (isOpen) {
      refreshMinScheduleTime();
      scheduleError.value = scheduleDate.value ? validateScheduleDate(scheduleDate.value) : '';
      stopTimer();
      minScheduleTimer = setInterval(() => {
        refreshMinScheduleTime();
      }, 30000);
    } else {
      stopTimer();
      scheduleError.value = '';
    }
  });

  onScopeDispose(() => {
    stopTimer();
  });

  const schedulePost = () => {
    if (!currentPost.value) return;
    refreshMinScheduleTime();
    scheduleError.value = validateScheduleDate(scheduleDate.value);
    if (scheduleError.value) {
      return;
    }
    isScheduling.value = true;
    const tz = userTimezone.value;
    const iso = localInputToUtcIso(scheduleDate.value, tz);
    router.post(
      `/projects/${projectId}/posts/${currentPost.value.id}/schedule`,
      { scheduledAt: iso },
      {
        headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
        preserveScroll: true,
        onFinish: () => { isScheduling.value = false; },
        onSuccess: () => {
          showSchedule.value = false;
          scheduleError.value = '';
          reloadPosts();
          analytics.capture('app.post_scheduled', { projectId: String(projectId), postId: String(currentPost.value.id) });
        },
        onError: () => {
          try {
            const err = (window?.__inertia ?? {}).page?.props?.flash?.error;
            if (err) {
              scheduleError.value = err;
              pushNotification?.('error', err);
            } else {
              scheduleError.value = 'Unable to schedule post. Try again.';
            }
          } catch {}
          analytics.capture('app.post_schedule_failed', { projectId: String(projectId), postId: String(currentPost.value.id) });
        },
      },
    );
  };

  const unschedulePost = () => {
    if (!currentPost.value) return;
    isUnscheduling.value = true;
    router.delete(
      `/projects/${projectId}/posts/${currentPost.value.id}/schedule`,
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
        onFinish: () => { isUnscheduling.value = false; },
        onSuccess: () => {
          analytics.capture('app.post_unscheduled', { projectId: String(projectId), postId: String(currentPost.value.id) });
          reloadPosts();
        },
      },
    );
  };

  const autoSchedulePost = () => {
    if (!currentPost.value) return;
    isAutoScheduling.value = true;
    router.post(
      `/projects/${projectId}/posts/${currentPost.value.id}/auto-schedule`,
      {},
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onFinish: () => { isAutoScheduling.value = false; },
        onSuccess: () => {
          analytics.capture('app.post_auto_scheduled', { projectId: String(projectId), postId: String(currentPost.value.id) });
          reloadPosts();
        },
      },
    );
  };

  return {
    showSchedule,
    scheduleDate,
    scheduleError,
    isScheduling,
    isUnscheduling,
    isAutoScheduling,
    minScheduleTime,
    scheduleHelperText,
    humanLeadRequirement,
    applyMinimumScheduleTime,
    openScheduleDialog,
    updateScheduleVisibility,
    updateScheduleDate,
    schedulePost,
    unschedulePost,
    autoSchedulePost,
  };
};
