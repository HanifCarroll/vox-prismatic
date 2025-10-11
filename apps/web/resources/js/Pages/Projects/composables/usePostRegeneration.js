import { computed, nextTick, ref, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import analytics from '@/lib/telemetry';
import { composePresetInstruction, findPresetHint, postTypePresetOptions } from '../utils/regeneratePresets';

const normalizeIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return Array.from(
    new Set(
      ids
        .map((id) => (id != null ? String(id) : ''))
        .filter((id) => id !== ''),
    ),
  );
};

/**
 * Handle regeneration flows, status tracking, and realtime post updates.
 * @param {Object} options
 * @param {string|number} options.projectId
 * @param {import('vue').Ref<Array<string>>} options.selectedIds
 * @param {import('vue').Ref<Object|null>} options.currentPost
 * @param {(id:string) => void} options.setSelectedPost
 * @param {(mutator:(post:Object)=>Object) => void} options.mapPosts
 * @param {(post:Object) => void} options.upsertPost
 * @param {() => void} options.reloadPosts
 * @param {() => void} [options.reloadProject]
 * @param {(type:'success'|'error'|'warn', message:string)=>void} options.pushNotification
 */
export const usePostRegeneration = ({
  projectId,
  selectedIds,
  currentPost,
  setSelectedPost,
  mapPosts,
  upsertPost,
  reloadPosts,
  reloadProject,
  pushNotification,
}) => {
  const regenOpen = ref(false);
  const regenCustom = ref('');
  const regenPostType = ref('');
  const isRegenerating = ref(false);
  const regeneratingPostIds = ref([]);

  const presetOptions = postTypePresetOptions;
  const selectedPresetHint = computed(() => findPresetHint(regenPostType.value));

  const addRegeneratingIds = (ids) => {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) return;
    const existing = new Set(regeneratingPostIds.value);
    normalized.forEach((id) => existing.add(id));
    regeneratingPostIds.value = Array.from(existing);
  };

  const removeRegeneratingIds = (ids) => {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) return;
    const existing = new Set(regeneratingPostIds.value);
    let changed = false;
    normalized.forEach((id) => {
      if (existing.delete(id)) {
        changed = true;
      }
    });
    if (changed) {
      regeneratingPostIds.value = Array.from(existing);
    }
  };

  const resetRegenerateState = () => {
    regenOpen.value = false;
    regenCustom.value = '';
    regenPostType.value = '';
  };

  watch(regenOpen, (isOpen) => {
    if (!isOpen) {
      regenCustom.value = '';
      regenPostType.value = '';
    }
  });

  const queueRegeneration = () => {
    const selected = normalizeIds(selectedIds.value);
    const fallbackId = currentPost.value?.id ? String(currentPost.value.id) : null;
    const combined = selected.length > 0 ? selected : (fallbackId ? [fallbackId] : []);
    const ids = normalizeIds(combined);
    if (ids.length === 0) {
      pushNotification?.('warn', 'Select a post to regenerate.');
      return;
    }

    const anchorId = currentPost.value?.id && ids.includes(String(currentPost.value.id))
      ? String(currentPost.value.id)
      : ids[0];
    if (anchorId) {
      setSelectedPost(anchorId);
    }

    addRegeneratingIds(ids);
    isRegenerating.value = true;

    const composedCustom = composePresetInstruction(regenCustom.value, regenPostType.value);
    const payload = { ids: ids.slice() };
    if (composedCustom && composedCustom.trim() !== '') {
      payload.customInstructions = composedCustom;
    }
    if (regenPostType.value) {
      payload.postType = regenPostType.value;
    }

    router.post(
      `/projects/${projectId}/posts/bulk-regenerate`,
      payload,
      {
        preserveScroll: true,
        preserveState: true,
        only: ['posts'],
        onFinish: () => { isRegenerating.value = false; },
        onSuccess: () => {
          resetRegenerateState();
          mapPosts((post) => (ids.includes(String(post.id)) ? { ...post, status: 'pending' } : post));
          analytics.capture('app.posts_regeneration_queued', {
            projectId: String(projectId),
            count: ids.length,
            postType: regenPostType.value || undefined,
            hasCustom: Boolean(composedCustom),
          });
        },
        onError: () => {
          removeRegeneratingIds(ids);
          pushNotification?.('error', 'Unable to queue regeneration. Please try again.');
          analytics.capture('app.posts_regeneration_queue_failed', {
            projectId: String(projectId),
            count: ids.length,
          });
        },
      },
    );
  };

  const handlePostRegenerated = (event) => {
    const payload = event?.post;
    if (!payload || !payload.id) {
      if (typeof reloadProject === 'function') {
        reloadProject();
      } else {
        reloadPosts();
      }
      return;
    }
    const id = String(payload.id);
    removeRegeneratingIds([id]);
    upsertPost(payload);
    pushNotification?.('success', 'Regenerated draft ready.');
    nextTick(() => setSelectedPost(id));
    reloadPosts();
  };

  const currentPostIsRegenerating = computed(() => {
    const id = currentPost.value?.id;
    if (!id) return false;
    return regeneratingPostIds.value.includes(String(id));
  });

  return {
    regenOpen,
    regenCustom,
    regenPostType,
    isRegenerating,
    regeneratingPostIds,
    presetOptions,
    selectedPresetHint,
    currentPostIsRegenerating,
    queueRegeneration,
    addRegeneratingIds,
    removeRegeneratingIds,
    resetRegenerateState,
    handlePostRegenerated,
  };
};
