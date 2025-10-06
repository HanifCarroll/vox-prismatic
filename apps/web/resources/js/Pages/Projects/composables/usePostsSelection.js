import { computed, ref, watch } from 'vue';

/**
 * Manage local post list, selection state, and deep-link param (?post=).
 * @param {import('vue').Ref<Array<any>>} postsRef - source posts from props
 */
export const usePostsSelection = (postsRef) => {
  const localPosts = ref([]);
  const selectedPostId = ref(null);
  const selectionRows = ref([]);
  const selectedIds = ref([]);

  const initialPostIdParam = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('post') || params.get('postId');
    } catch (e) {
      return null;
    }
  })();

  const setSelectedPost = (id) => {
    if (!id) return;
    selectedPostId.value = id;
  };

  const hasSelection = computed(() => selectedIds.value.length > 0);

  // Sync when source posts change
  watch(
    () => postsRef.value,
    (next) => {
      const items = Array.isArray(next) ? next.slice() : [];
      localPosts.value = items;
      if (initialPostIdParam && items.find((p) => p.id === initialPostIdParam)) {
        selectedPostId.value = initialPostIdParam;
      }
      if (selectedPostId.value && !items.find((p) => p.id === selectedPostId.value)) {
        selectedPostId.value = items.length > 0 ? items[0].id : null;
      }
      if (!selectedPostId.value && items.length > 0) {
        selectedPostId.value = items[0].id;
      }
      // Drop selections no longer present
      selectedIds.value = selectedIds.value.filter((id) => items.some((p) => p.id === id));
      selectionRows.value = items.filter((p) => selectedIds.value.includes(p.id));
    },
    { immediate: true, deep: true },
  );

  // Reflect selection in the URL
  watch(
    () => selectedPostId.value,
    (id) => {
      try {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set('post', id);
        else url.searchParams.delete('post');
        window.history.replaceState({}, '', url);
      } catch {}
    },
  );

  // Keep selectedIds in sync with selectionRows
  watch(
    () => selectionRows.value,
    (rows) => {
      selectedIds.value = Array.isArray(rows) ? rows.map((r) => r.id) : [];
    },
  );

  const allSelectedModel = computed({
    get: () => selectedIds.value.length > 0 && selectedIds.value.length === localPosts.value.length,
    set: (checked) => {
      if (checked) {
        selectedIds.value = localPosts.value.map((p) => p.id);
        selectionRows.value = localPosts.value.slice();
      } else {
        selectedIds.value = [];
        selectionRows.value = [];
      }
    },
  });

  const currentPost = computed(() => localPosts.value.find((p) => p.id === selectedPostId.value) ?? null);

  return {
    localPosts,
    selectedPostId,
    selectionRows,
    selectedIds,
    allSelectedModel,
    hasSelection,
    setSelectedPost,
    currentPost,
  };
};

