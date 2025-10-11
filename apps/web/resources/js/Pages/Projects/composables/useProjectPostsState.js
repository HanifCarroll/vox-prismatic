import { computed, ref, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import analytics from '@/lib/telemetry';
import { usePostsSelection } from './usePostsSelection';

const isPublished = (post) => Boolean(post?.publishedAt) || (post?.status ?? '') === 'published';
const isScheduled = (post) => Boolean(post?.scheduledAt) || (post?.scheduleStatus ?? '') === 'scheduled';
const needsApproval = (post) => !isPublished(post) && (post?.status ?? 'pending') !== 'approved';

const defaultFilters = [
  { value: 'all', label: 'All posts' },
  { value: 'needsApproval', label: 'Needs approval' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
];

const predicateMap = {
  all: () => true,
  needsApproval,
  unscheduled: (post) => !isPublished(post) && !isScheduled(post),
  scheduled: (post) => !isPublished(post) && isScheduled(post),
  published: isPublished,
};

const normalizePosts = (list) => (Array.isArray(list) ? list.map((post) => ({ ...post })) : []);

/**
 * Centralize project posts cache, filters, selection, and reload helpers.
 * @param {Object} options
 * @param {import('vue').Ref<Array>} options.postsRef
 * @param {Array} [options.filters]
 * @param {string} [options.defaultFilter]
 * @param {string|number} [options.projectId]
 */
export const useProjectPostsState = ({ postsRef, filters, defaultFilter = 'all', projectId }) => {
  const allPosts = ref([]);

  const resolvedFilters = (Array.isArray(filters) && filters.length > 0 ? filters : defaultFilters).map((filter) => ({
    ...filter,
    predicate: typeof filter.predicate === 'function' ? filter.predicate : (predicateMap[filter.value] ?? predicateMap.all),
  }));

  const filterValues = resolvedFilters.map((filter) => filter.value);
  const initialFilter = filterValues.includes(defaultFilter) ? defaultFilter : resolvedFilters[0]?.value ?? 'all';
  const filterValue = ref(initialFilter);

  const setAllPosts = (posts) => {
    allPosts.value = normalizePosts(posts);
  };

  watch(
    postsRef,
    (next) => {
      setAllPosts(next);
    },
    { immediate: true, deep: true },
  );

  const activeFilter = computed(() => resolvedFilters.find((filter) => filter.value === filterValue.value) ?? resolvedFilters[0]);

  const filteredPosts = computed(() => {
    const predicate = activeFilter.value?.predicate ?? predicateMap.all;
    return normalizePosts(allPosts.value).filter((post) => predicate(post));
  });

  const filterOptions = computed(() => {
    const counts = resolvedFilters.reduce((acc, filter) => {
      acc[filter.value] = 0;
      return acc;
    }, {});

    const posts = Array.isArray(allPosts.value) ? allPosts.value : [];
    posts.forEach((post) => {
      resolvedFilters.forEach((filter) => {
        const predicate = filter.predicate ?? predicateMap.all;
        if (predicate(post)) {
          counts[filter.value] = (counts[filter.value] ?? 0) + 1;
        }
      });
    });

    const total = posts.length;
    return resolvedFilters.map((filter) => ({
      ...filter,
      count: counts[filter.value] ?? total,
    }));
  });

  const totalPostCount = computed(() => (Array.isArray(allPosts.value) ? allPosts.value.length : 0));
  const filteredPostCount = computed(() => filteredPosts.value.length);

  const {
    localPosts,
    selectedPostId,
    selectionRows,
    selectedIds,
    allSelectedModel,
    hasSelection,
    setSelectedPost,
    currentPost,
  } = usePostsSelection(filteredPosts);

  const setFilter = (value) => {
    filterValue.value = filterValues.includes(value) ? value : initialFilter;
  };

  const setAllSelected = (checked) => {
    allSelectedModel.value = !!checked;
  };

  const updateSelectionRows = (rows) => {
    selectionRows.value = Array.isArray(rows) ? rows : [];
  };

  const pruneSelection = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const idSet = new Set(ids.map((id) => String(id)));
    selectionRows.value = selectionRows.value.filter((row) => !idSet.has(String(row.id)));
    selectedIds.value = selectedIds.value.filter((id) => !idSet.has(String(id)));
  };

  const mapPosts = (mapper) => {
    const current = Array.isArray(allPosts.value) ? allPosts.value : [];
    allPosts.value = current.map((post) => {
      const next = mapper({ ...post });
      return next ?? post;
    });
  };

  const upsertPost = (incoming) => {
    if (!incoming || !incoming.id) return;
    const id = String(incoming.id);
    const current = Array.isArray(allPosts.value) ? allPosts.value.slice() : [];
    const index = current.findIndex((post) => String(post.id) === id);
    if (index >= 0) {
      current[index] = { ...current[index], ...incoming };
    } else {
      current.push({ ...incoming });
    }
    allPosts.value = current;
  };

  const replacePosts = (next) => {
    setAllPosts(next);
  };

  const reloadInFlight = ref(false);
  const reloadPosts = () => {
    if (reloadInFlight.value) {
      return;
    }
    reloadInFlight.value = true;
    router.reload({
      only: ['posts'],
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        try {
          if (window.__vp_trackGeneratedAfterReload) {
            const count = Array.isArray(allPosts.value) ? allPosts.value.length : 0;
            const payload = { count };
            if (projectId != null) {
              payload.projectId = String(projectId);
            }
            analytics.capture('app.posts_generated', payload);
            window.__vp_trackGeneratedAfterReload = false;
          }
        } catch {}
      },
      onFinish: () => {
        reloadInFlight.value = false;
      },
    });
  };

  return {
    allPosts,
    filteredPosts,
    totalPostCount,
    filteredPostCount,
    filterValue,
    filterOptions,
    setFilter,
    selection: {
      localPosts,
      selectedPostId,
      selectionRows,
      selectedIds,
      hasSelection,
      allSelectedModel,
      setSelectedPost,
      setAllSelected,
      updateSelectionRows,
      currentPost,
      pruneSelection,
    },
    mapPosts,
    upsertPost,
    replacePosts,
    reloadPosts,
  };
};
