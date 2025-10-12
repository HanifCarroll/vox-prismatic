<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import { useNotifications } from '@/utils/notifications';
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';
import { Button } from '@/components/ui/button';
import HookWorkbenchDrawer from './components/HookWorkbenchDrawer.vue';
import ProjectHeaderStatus from './components/ProjectHeaderStatus.vue';
import ProjectTabs from './components/ProjectTabs.vue';
import TranscriptEditor from './components/TranscriptEditor.vue';
import PostsToolbar from './components/PostsToolbar.vue';
import PostsSidebar from './components/PostsSidebar.vue';
import PostEditor from './components/PostEditor.vue';
import PostReviewPanel from './components/PostReviewPanel.vue';
import RegenerateDialog from './components/RegenerateDialog.vue';
import ScheduleDialog from './components/ScheduleDialog.vue';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { arraysEqual } from '@/utils/arrays';
import { mergeHookIntoContent } from './utils/hookWorkbench';
import analytics from '@/lib/telemetry';
import { useHashtags } from './composables/useHashtags';
import { useProjectPostsState } from './composables/useProjectPostsState';
import { useProjectProcessingState } from './composables/useProjectProcessingState';
import { usePostScheduling } from './composables/usePostScheduling';
import { usePostRegeneration } from './composables/usePostRegeneration';
import { usePostActions } from './composables/usePostActions';

const props = defineProps({
  project: { type: Object, required: true },
  posts: { type: Array, default: () => [] },
  channels: {
    type: Object,
    default: () => ({ project: null, user: null }),
  },
  linkedIn: {
    type: Object,
    default: () => ({ connected: false }),
  },
  preferences: {
    type: Object,
    default: () => ({ timezone: 'UTC' }),
  },
  initialTab: { type: String, default: 'transcript' },
});

const { push: pushNotification } = useNotifications();

const projectState = ref({ ...props.project });
const projectId = computed(() => projectState.value?.id ?? props.project?.id ?? null);

const form = useForm({
  title: projectState.value.title ?? '',
  transcript: projectState.value.transcript ?? '',
});

const activeTab = ref(['transcript', 'posts'].includes(props.initialTab) ? props.initialTab : 'transcript');

const getCsrfToken = () => {
  try {
    const el = document.head?.querySelector('meta[name="csrf-token"]');
    return el?.getAttribute('content') || null;
  } catch {
    return null;
  }
};

const preferencesRef = toRef(props, 'preferences');

const postFilters = [
  { value: 'all', label: 'All posts' },
  { value: 'needsApproval', label: 'Needs approval' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
];

const postsState = useProjectPostsState({
  postsRef: toRef(props, 'posts'),
  filters: postFilters,
  projectId: projectId.value,
});

const {
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
  },
  mapPosts,
  upsertPost,
  reloadPosts,
} = postsState;

const postRegeneration = usePostRegeneration({
  projectId: projectId.value,
  selectedIds,
  currentPost,
  setSelectedPost,
  mapPosts,
  upsertPost,
  reloadPosts,
  reloadProject,
  pushNotification,
});

const {
  regenOpen,
  regenCustom,
  regenPostType,
  isRegenerating,
  regeneratingPostIds,
  presetOptions,
  selectedPresetHint,
  currentPostIsRegenerating: currentPostIsRegeneratingRef,
  queueRegeneration,
  resetRegenerateState,
  handlePostRegenerated,
} = postRegeneration;

const processing = useProjectProcessingState({
  projectId: projectId.value,
  projectState,
  initialState: {
    stage: projectState.value.currentStage ?? null,
    progress: projectState.value.processingProgress ?? 0,
    step: projectState.value.processingStep ?? null,
  },
  channels: props.channels ?? {},
  onReloadRequested: reloadProject,
  onSwitchToPosts: () => {
    if (activeTab.value !== 'posts') {
      activeTab.value = 'posts';
      if (projectId.value) {
        router.visit(`/projects/${projectId.value}/posts`, { preserveScroll: true, preserveState: true, replace: true });
      }
    }
  },
  onPostRegenerated: (event) => handlePostRegenerated(event),
});

const { progress, processingStep, processingError, isRealtimeUnavailable, syncFromProject, resetProcessingError } = processing;

const postScheduling = usePostScheduling({
  projectId: projectId.value,
  currentPost,
  preferencesRef,
  getCsrfToken,
  reloadPosts,
  pushNotification,
});

const {
  showSchedule,
  scheduleDate,
  scheduleError,
  isScheduling,
  isUnscheduling,
  isAutoScheduling,
  minScheduleTime,
  scheduleHelperText,
  applyMinimumScheduleTime,
  openScheduleDialog,
  updateScheduleVisibility,
  updateScheduleDate,
  schedulePost,
  unschedulePost,
  autoSchedulePost,
} = postScheduling;

const postActions = usePostActions({
  projectId: projectId.value,
  projectState,
  postsState,
  currentPost,
  pushNotification,
});

const {
  updatePostStatus,
  bulkSetStatus,
  publishNow,
  autoScheduleSelected,
  bulkUnscheduleSelected,
  bulkAutoScheduling,
} = postActions;

watch(
  () => props.project,
  (incoming) => {
    projectState.value = { ...incoming };
    form.defaults({
      title: incoming.title ?? '',
      transcript: incoming.transcript ?? '',
    });
    if (!form.processing) {
      form.reset();
    }
    syncFromProject(incoming);
  },
  { deep: true },
);

const resetForm = () => {
  form.reset();
  resetProcessingError();
};

const saveDetails = () => {
  form.put(`/projects/${projectState.value.id}`, {
    preserveScroll: true,
    onSuccess: () => {
      resetProcessingError();
    },
  });
};

const clearHashtagsVisible = ref(false);
const hookWorkbenchOpen = ref(false);
const isDeleting = ref(false);
const deleteConfirmVisible = ref(false);

const editorContent = ref('');
const editorHashtags = ref([]);
const { sanitizeHashtag } = useHashtags(editorHashtags);
const editorSaving = ref(false);

const postDirty = computed(() => {
  const cp = currentPost.value;
  if (!cp) return false;
  const contentEqual = (editorContent.value ?? '') === (cp.content ?? '');
  const hashtagsEqual = arraysEqual(editorHashtags.value, Array.isArray(cp.hashtags) ? cp.hashtags : []);
  return !(contentEqual && hashtagsEqual);
});

const transcriptDirty = computed(() => {
  return (
    (form.title ?? '') !== (projectState.value.title ?? '') ||
    (form.transcript ?? '') !== (projectState.value.transcript ?? '')
  );
});

const anyDirty = computed(() => transcriptDirty.value || postDirty.value);

const handleBeforeUnload = (event) => {
  if (anyDirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
};

watch(anyDirty, (dirty) => {
  if (dirty) {
    window.addEventListener('beforeunload', handleBeforeUnload);
  } else {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
}, { immediate: true });

watch(
  () => currentPost.value,
  (post, previous) => {
    if (!post) {
      editorContent.value = '';
      editorHashtags.value = [];
      hookWorkbenchOpen.value = false;
      return;
    }
    if (previous && post.id !== previous.id) {
      hookWorkbenchOpen.value = false;
    }
    editorContent.value = post.content ?? '';
    editorHashtags.value = Array.isArray(post.hashtags) ? post.hashtags.slice() : [];
  },
  { immediate: true },
);

watch(
  editorHashtags,
  (values) => {
    if (!Array.isArray(values)) {
      editorHashtags.value = [];
      return;
    }
    const normalized = [];
    values.forEach((entry) => {
      const cleaned = sanitizeHashtag(entry);
      if (cleaned && !normalized.includes(cleaned)) {
        normalized.push(cleaned);
      }
    });
    const unchanged = normalized.length === values.length && normalized.every((value, index) => value === values[index]);
    if (!unchanged) {
      editorHashtags.value = normalized;
    }
  },
  { deep: true },
);

const requestClearHashtags = () => {
  const current = Array.isArray(editorHashtags.value) ? editorHashtags.value : [];
  if (current.length === 0) return;
  clearHashtagsVisible.value = true;
};

const confirmClearHashtags = () => {
  editorHashtags.value = [];
  clearHashtagsVisible.value = false;
  try { pushNotification('success', 'Removed all hashtags.'); } catch {}
};

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Published', value: 'published', disabled: true },
];

const linkedInConnected = computed(() => Boolean(props.linkedIn?.connected));
const selectedCount = computed(() => selectedIds.value.length);
const totalLocalPosts = computed(() => localPosts.value.length);
const indeterminateSelection = computed(() => selectedCount.value > 0 && selectedCount.value < totalLocalPosts.value);
const canBulkAutoSchedule = computed(() => linkedInConnected.value);
const bulkActionDisabled = computed(() => !hasSelection.value);

const startLinkedInAuth = () => {
  analytics.capture('app.linkedin_connect_clicked');
  window.location.href = '/settings/linked-in/auth';
};

const savePost = () => {
  if (!currentPost.value || editorSaving.value) return;
  editorSaving.value = true;
  router.patch(
    `/projects/${projectState.value.id}/posts/${currentPost.value.id}`,
    {
      content: editorContent.value?.slice(0, 3000) ?? '',
      hashtags: Array.isArray(editorHashtags.value) ? editorHashtags.value : [],
    },
    {
      preserveScroll: true,
      preserveState: true,
      only: ['posts'],
      onFinish: () => { editorSaving.value = false; },
      onSuccess: () => { reloadPosts(); },
    },
  );
};

const applyHookToDraft = (hook) => {
  if (!hook) {
    return;
  }
  const merged = mergeHookIntoContent(editorContent.value ?? '', hook);
  editorContent.value = merged.slice(0, 3000);
};

const deleteProject = () => {
  if (isDeleting.value) return;
  deleteConfirmVisible.value = true;
};

const confirmDeleteProject = () => {
  if (isDeleting.value) return;
  isDeleting.value = true;
  router.delete(`/projects/${projectState.value.id}`, {
    headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
    onFinish: () => { isDeleting.value = false; deleteConfirmVisible.value = false; },
  });
};

let isReloadingProject = false;
function reloadProject() {
  if (isReloadingProject) {
    return;
  }
  isReloadingProject = true;
  router.reload({
    only: ['project', 'posts'],
    preserveScroll: true,
    onSuccess: () => {
      resetProcessingError();
    },
    onFinish: () => {
      isReloadingProject = false;
    },
  });
}

const handleTabChange = (tab) => {
  if (activeTab.value === tab) return;
  const id = projectId.value;
  if (!id) return;
  activeTab.value = tab;
  router.visit(`/projects/${id}/${tab}`, { preserveState: true, preserveScroll: true, replace: true });
};

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

const currentPostIsRegenerating = computed(() => currentPostIsRegeneratingRef.value);
const currentReview = computed(() => currentPost.value?.review ?? null);

const openRegenerateDialog = () => {
  regenOpen.value = true;
};

const handleRegenerateVisibleUpdate = (visible) => {
  if (!visible) {
    resetRegenerateState();
  } else {
    regenOpen.value = visible;
  }
};

const updateRegenPostType = (value) => {
  regenPostType.value = value;
};

const updateRegenCustom = (value) => {
  regenCustom.value = value;
};
</script>

<template>
  <AppLayout :title="projectState.title ?? 'Project'">
    <Head :title="projectState.title ?? 'Project'" />
    <section class="space-y-6">
      <ProjectHeaderStatus
        :title="projectState.title ?? 'Project'"
        :createdAt="projectState.createdAt"
        :updatedAt="projectState.updatedAt"
        :stage="projectState.currentStage"
        :progress="progress"
        :step="processingStep"
        :processingError="processingError"
        :isRealtimeUnavailable="isRealtimeUnavailable"
        :isDeleting="isDeleting"
        @delete="deleteProject"
      />

      <div>
        <ProjectTabs :activeTab="activeTab" @change="handleTabChange" />

        <TranscriptEditor v-if="activeTab === 'transcript'" :form="form" @save="saveDetails" @reset="resetForm" />

        <section v-else class="space-y-4 rounded-b-md border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
          <p v-if="totalPostCount === 0" class="text-sm text-zinc-600">
            No posts generated yet.
          </p>
          <p v-else-if="filteredPostCount === 0" class="text-sm text-zinc-600">
            No posts match your filter.
          </p>

          <div v-else class="space-y-4">
            <div v-if="!linkedInConnected" class="rounded-md border border-zinc-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <div class="text-sm text-zinc-700">Connect LinkedIn to enable publishing and scheduling.</div>
                <Button
                  variant="outline"
                  size="sm"
                  @click="startLinkedInAuth"
                >
                  Connect LinkedIn
                </Button>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div class="space-y-3 md:col-span-1">
                <PostsToolbar
                  :selectedCount="selectedCount"
                  :filters="filterOptions"
                  :filterValue="filterValue"
                  :bulkActionDisabled="bulkActionDisabled"
                  :canBulkAutoSchedule="canBulkAutoSchedule"
                  :bulkAutoScheduling="bulkAutoScheduling"
                  @update:filter="setFilter"
                  @approve="() => bulkSetStatus(selectedIds, 'approved')"
                  @markPending="() => bulkSetStatus(selectedIds, 'pending')"
                  @reject="() => bulkSetStatus(selectedIds, 'rejected')"
                  @openRegenerate="openRegenerateDialog"
                  @bulkUnschedule="bulkUnscheduleSelected"
                  @autoSchedule="() => autoScheduleSelected(linkedInConnected)"
                />
                <PostsSidebar
                  :posts="localPosts"
                  :selection="selectionRows"
                  :selectedPostId="selectedPostId"
                  :regeneratingIds="regeneratingPostIds"
                  :allSelected="allSelectedModel"
                  :indeterminate="indeterminateSelection"
                  @update:selection="updateSelectionRows"
                  @update:allSelected="setAllSelected"
                  @select="(id) => setSelectedPost(id)"
                />
              </div>

              <div class="space-y-4 md:col-span-2">
                <PostEditor
                  :post="currentPost"
                  :content="editorContent"
                  :hashtags="editorHashtags"
                  :statusOptions="statusOptions"
                  :editorSaving="editorSaving"
                  :postDirty="postDirty"
                  :linkedInConnected="linkedInConnected"
                  :isAutoScheduling="isAutoScheduling"
                  :isUnscheduling="isUnscheduling"
                  :isRegenerating="currentPostIsRegenerating"
                  @update:content="(value) => { editorContent = value; }"
                  @update:hashtags="(value) => { editorHashtags = value; }"
                  @changeStatus="(status) => { if (currentPost) updatePostStatus(currentPost.id, status); }"
                  @openWorkbench="() => { if (currentPost) { hookWorkbenchOpen = true; } }"
                  @openRegenerate="openRegenerateDialog"
                  @clearHashtags="requestClearHashtags"
                  @save="savePost"
                  @scheduleOpen="openScheduleDialog"
                  @publishNow="publishNow"
                  @unschedulePost="unschedulePost"
                  @autoSchedulePost="autoSchedulePost"
                />
                <PostReviewPanel :review="currentReview" />
              </div>
            </div>
          </div>

          <RegenerateDialog
            :visible="regenOpen"
            :regenPostType="regenPostType"
            :regenCustom="regenCustom"
            :presetOptions="presetOptions"
            :selectedPresetHint="selectedPresetHint"
            :isRegenerating="isRegenerating"
            @update:visible="handleRegenerateVisibleUpdate"
            @update:regenPostType="updateRegenPostType"
            @update:regenCustom="updateRegenCustom"
            @regenerate="queueRegeneration"
          />

          <ScheduleDialog
            :visible="showSchedule"
            :scheduleDate="scheduleDate"
            :isScheduling="isScheduling"
            :canUnschedule="Boolean(currentPost && currentPost.scheduledAt)"
            :isUnscheduling="isUnscheduling"
            :minScheduleTime="minScheduleTime"
            :helperText="scheduleHelperText"
            :errorMessage="scheduleError"
            @useMinimum="applyMinimumScheduleTime"
            @update:visible="updateScheduleVisibility"
            @update:scheduleDate="updateScheduleDate"
            @schedule="schedulePost"
            @unschedule="unschedulePost"
          />

          <HookWorkbenchDrawer
            :open="hookWorkbenchOpen"
            :post="currentPost"
            :baseContent="editorContent"
            :onClose="() => { hookWorkbenchOpen = false; }"
            :onApplyHook="applyHookToDraft"
          />

          <AlertDialog v-model:open="deleteConfirmVisible">
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this project and all its generated posts. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button type="button" variant="secondary" size="sm" :disabled="isDeleting">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" variant="destructive" size="sm" :disabled="isDeleting" @click="confirmDeleteProject">
                    <span v-if="isDeleting" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                    Delete project
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog v-model:open="clearHashtagsVisible">
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all hashtags?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes all hashtags from the current post. You can add them back later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button type="button" variant="secondary" size="sm">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" variant="destructive" size="sm" @click="confirmClearHashtags">
                    Clear
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </section>
  </AppLayout>
</template>
