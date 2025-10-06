<script setup>
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import AutoComplete from 'primevue/autocomplete';
import { formatDateTime } from '@/utils/datetime';
import { computed } from 'vue';
import { useHashtags } from '../composables/useHashtags';

const props = defineProps({
  post: { type: Object, default: null },
  content: { type: String, default: '' },
  hashtags: { type: Array, default: () => [] },
  statusOptions: { type: Array, default: () => [] },
  editorSaving: { type: Boolean, default: false },
  postDirty: { type: Boolean, default: false },
  linkedInConnected: { type: Boolean, default: false },
  isAutoScheduling: { type: Boolean, default: false },
  isUnscheduling: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:content',
  'update:hashtags',
  'changeStatus',
  'openWorkbench',
  'openRegenerate',
  'save',
  'scheduleOpen',
  'publishNow',
  'unschedulePost',
  'autoSchedulePost',
  'clearHashtags',
]);

const contentModel = computed({
  get: () => props.content,
  set: (v) => emit('update:content', v),
});

const hashtagsModel = computed({
  get: () => props.hashtags,
  set: (v) => emit('update:hashtags', v),
});

const {
  hashtagsInputRef,
  hashtagSuggestions,
  handleHashtagKeydown,
  handleHashtagBlur,
  handleHashtagPaste,
  handleHashtagComplete,
} = useHashtags(hashtagsModel);
</script>

<template>
  <div class="flex min-h-[360px] flex-col rounded-md border border-zinc-200 bg-white p-4">
    <div class="flex items-center justify-between gap-2">
      <div class="hidden sm:flex">
        <SelectButton
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          :modelValue="post?.status ?? 'pending'"
          @update:modelValue="(val) => { if (val && val !== 'published' && post) emit('changeStatus', val); }"
        />
      </div>
      <div class="flex items-center gap-2">
        <PrimeButton size="small" label="Hook Workbench" outlined :disabled="!post" @click="() => emit('openWorkbench')" />
        <PrimeButton size="small" label="Regenerate" severity="secondary" :disabled="!post" @click="() => emit('openRegenerate')" />
      </div>
    </div>
    <div class="mt-3 flex-1">
      <Textarea
        :modelValue="contentModel"
        @update:modelValue="(v) => contentModel = v"
        autoResize
        :rows="10"
        class="w-full"
        placeholder="Edit post content…"
        @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !editorSaving && post && postDirty) { e.preventDefault(); emit('save'); } }"
      />
      <div class="mt-2 flex items-center justify-between text-xs text-zinc-600">
        <span class="tabular-nums text-zinc-500">{{ (content || '').length }}/3000</span>
        <PrimeButton size="small" label="Save" severity="secondary" :disabled="!post || editorSaving || !postDirty" @click="() => emit('save')" />
      </div>
    </div>
    <div class="mt-3">
      <div class="mb-1 flex items-center justify-between">
        <label class="block text-sm font-medium text-zinc-800">Hashtags</label>
        <PrimeButton size="small" label="Clear hashtags" severity="danger" outlined :disabled="!post || (hashtags?.length ?? 0) === 0" @click="() => emit('clearHashtags')" />
      </div>
      <AutoComplete
        ref="hashtagsInputRef"
        :modelValue="hashtagsModel"
        @update:modelValue="(v) => { hashtagsModel = v; }"
        multiple
        :typeahead="false"
        :suggestions="hashtagSuggestions"
        placeholder="#hashtag"
        fluid
        @complete="handleHashtagComplete"
        @keydown="handleHashtagKeydown"
        @blur="handleHashtagBlur"
        @paste="handleHashtagPaste"
      />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2 justify-end">
      <PrimeButton size="small" label="Schedule" :disabled="!post || post.status!=='approved' || editorSaving || !linkedInConnected" @click="() => emit('scheduleOpen')" />
      <PrimeButton size="small" label="Auto-schedule" severity="secondary" :disabled="!post || post.status!=='approved' || editorSaving || isAutoScheduling || !linkedInConnected" @click="() => emit('autoSchedulePost')" />
      <PrimeButton size="small" label="Publish Now" :disabled="!post || post.status!=='approved' || editorSaving" @click="() => emit('publishNow')" />
    </div>

    <div v-if="post" class="mt-3 text-xs text-zinc-600">
      <div v-if="post.publishedAt">Published at {{ formatDateTime(post.publishedAt) }}</div>
      <div v-else-if="post.scheduledAt" class="flex items-center gap-2">
        <span>Scheduled for {{ formatDateTime(post.scheduledAt) }}</span>
        <PrimeButton size="small" label="Unschedule" severity="danger" outlined :disabled="isUnscheduling" @click="() => emit('unschedulePost')" />
      </div>
      <div v-else class="text-zinc-500">Not scheduled</div>
    </div>
  </div>
</template>
