import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import analytics from '@/lib/telemetry';

/**
 * Group post mutations: status updates, publishing, and bulk operations.
 * @param {Object} options
 * @param {string|number} options.projectId
 * @param {import('vue').Ref<Object>} options.projectState
 * @param {Object} options.postsState
 * @param {import('vue').Ref<Object|null>} options.currentPost
 * @param {(type:'success'|'error'|'warn'|'info', message:string)=>void} options.pushNotification
 */
export const usePostActions = ({
  projectId,
  projectState,
  postsState,
  currentPost,
  pushNotification,
}) => {
  const bulkAutoScheduling = ref(false);
  let updatingStage = false;

  const maybeMarkProjectReady = async () => {
    if (updatingStage) return;
    const stage = projectState?.value?.currentStage ?? 'processing';
    if (stage !== 'posts') return;
    const posts = postsState.allPosts.value ?? [];
    const hasPending = posts.some((post) => (post.status ?? 'pending') === 'pending');
    if (hasPending) return;
    try {
      updatingStage = true;
      await router.put(`/projects/${projectId}/stage`, { nextStage: 'ready' }, { preserveScroll: true });
      if (projectState?.value) {
        projectState.value = { ...projectState.value, currentStage: 'ready' };
      }
    } catch (error) {
      console.error('Failed to update stage', error);
    } finally {
      updatingStage = false;
    }
  };

  const updatePostStatus = (postId, status) => {
    if (!postId) return;
    router.patch(
      `/projects/${projectId}/posts/${postId}`,
      { status },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onSuccess: () => {
          postsState.mapPosts((post) => (post.id === postId ? { ...post, status } : post));
          maybeMarkProjectReady();
          if (status === 'approved') {
            analytics.capture('app.post_approved', { projectId: String(projectId), postId: String(postId) });
          } else if (status === 'rejected') {
            analytics.capture('app.post_rejected', { projectId: String(projectId), postId: String(postId) });
          } else if (status === 'pending') {
            analytics.capture('app.post_pending', { projectId: String(projectId), postId: String(postId) });
          }
        },
      },
    );
  };

  const bulkSetStatus = (ids, status) => {
    const list = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id !== '') : [];
    if (list.length === 0) {
      return;
    }
    router.post(
      `/projects/${projectId}/posts/bulk-status`,
      { ids: list, status },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onSuccess: () => {
          postsState.mapPosts((post) => (list.includes(post.id) ? { ...post, status } : post));
          postsState.selection.pruneSelection(list);
          maybeMarkProjectReady();
        },
      },
    );
  };

  const publishNow = () => {
    if (!currentPost.value) return;
    analytics.capture('app.publish_now_requested', { projectId: String(projectId), postId: String(currentPost.value.id) });
    router.post(
      `/projects/${projectId}/posts/${currentPost.value.id}/publish`,
      {},
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onSuccess: () => {
          analytics.capture('app.publish_now_succeeded', { projectId: String(projectId), postId: String(currentPost.value.id) });
          postsState.reloadPosts();
        },
        onError: () => {
          analytics.capture('app.publish_now_failed', { projectId: String(projectId), postId: String(currentPost.value.id) });
        },
      },
    );
  };

  const autoScheduleSelected = (linkedInConnected) => {
    if (bulkAutoScheduling.value || !linkedInConnected) {
      return;
    }
    const ids = postsState.selection.selectedIds.value.slice();
    const targetList = ids.length > 0
      ? postsState.selection.localPosts.value.filter((post) => ids.includes(post.id))
      : postsState.selection.localPosts.value;
    const eligible = targetList.filter((post) => post.status === 'approved' && !post.scheduledAt);
    if (eligible.length === 0) {
      pushNotification?.('info', 'No approved posts available for auto-scheduling.');
      return;
    }
    const payload = ids.length > 0 ? { ids } : {};
    bulkAutoScheduling.value = true;
    router.post(
      `/projects/${projectId}/posts/auto-schedule`,
      payload,
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onFinish: () => { bulkAutoScheduling.value = false; },
        onSuccess: () => {
          if (ids.length > 0) {
            postsState.selection.pruneSelection(ids);
          }
          postsState.reloadPosts();
          analytics.capture('app.posts_auto_scheduled', {
            projectId: String(projectId),
            count: ids.length || undefined,
          });
        },
      },
    );
  };

  const bulkUnscheduleSelected = () => {
    const ids = postsState.selection.selectedIds.value.slice();
    if (ids.length === 0) return;
    const count = ids.length;
    const confirmed = window.confirm(`Unschedule ${count} selected post${count > 1 ? 's' : ''}?`);
    if (!confirmed) {
      return;
    }
    router.post(
      `/projects/${projectId}/posts/bulk-unschedule`,
      { ids },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onSuccess: () => {
          const idSet = new Set(ids);
          postsState.mapPosts((post) => (idSet.has(post.id)
            ? {
              ...post,
              scheduledAt: null,
              scheduleStatus: null,
              scheduleError: null,
              scheduleAttemptedAt: null,
            }
            : post));
          postsState.selection.pruneSelection(ids);
          pushNotification?.('success', `${count} post${count > 1 ? 's' : ''} unscheduled.`);
          analytics.capture('app.posts_bulk_unscheduled', { projectId: String(projectId), count });
        },
      },
    );
  };

  return {
    updatePostStatus,
    bulkSetStatus,
    publishNow,
    autoScheduleSelected,
    bulkUnscheduleSelected,
    bulkAutoScheduling,
  };
};
