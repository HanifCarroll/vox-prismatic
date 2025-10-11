<script setup>
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { computed, ref, watch } from 'vue';

const props = defineProps({
  allSelected: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  filters: { type: Array, default: () => [] },
  filterValue: { type: String, default: 'all' },
  bulkActionDisabled: { type: Boolean, default: false },
  canBulkAutoSchedule: { type: Boolean, default: false },
  bulkAutoScheduling: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:allSelected',
  'update:filter',
  'approve',
  'markPending',
  'reject',
  'openRegenerate',
  'bulkUnschedule',
  'autoSchedule',
]);

const bulkPopoverOpen = ref(false);

const hasSelection = computed(() => props.selectedCount > 0);
const bulkButtonLabel = computed(() => hasSelection.value
  ? `Bulk actions (${props.selectedCount})`
  : 'Bulk actions');
const bulkActionsDisabled = computed(() => !hasSelection.value || props.bulkActionDisabled);

watch(
  () => props.selectedCount,
  (count) => {
    if (count === 0) {
      bulkPopoverOpen.value = false;
    }
  },
);

const triggerAndClose = (eventName) => {
  emit(eventName);
  bulkPopoverOpen.value = false;
};
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
      <div
        v-if="props.filters.length > 0"
        class="flex items-center gap-1 text-xs text-zinc-600"
      >
        <label class="sr-only" for="post-filter">Filter posts</label>
        <select
          id="post-filter"
          :value="props.filterValue"
          class="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          @change="(event) => emit('update:filter', event.target.value)"
        >
          <option v-for="option in props.filters" :key="option.value" :value="option.value">
            {{ option.count != null ? `${option.label} (${option.count})` : option.label }}
          </option>
        </select>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Popover v-model:open="bulkPopoverOpen">
        <PopoverTrigger as-child>
          <span>
            <Button
              size="sm"
              variant="outline"
              :disabled="bulkActionsDisabled"
            >
              {{ bulkButtonLabel }}
            </Button>
          </span>
        </PopoverTrigger>
        <PopoverContent
          class="w-72 border border-zinc-200 bg-white p-0 shadow-lg"
          align="end"
        >
          <div class="border-b border-zinc-100 px-3 py-2">
            <p class="text-sm font-semibold text-zinc-900">
              {{ props.selectedCount }} {{ props.selectedCount === 1 ? 'post' : 'posts' }} selected
            </p>
            <p class="text-xs text-zinc-500">
              Choose a bulk action to apply to the current selection.
            </p>
          </div>
          <div class="flex flex-col">
            <button
              type="button"
              class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              @click="() => triggerAndClose('approve')"
            >
              <span class="font-medium text-zinc-900">Approve</span>
              <span class="text-xs text-zinc-500">Move selected posts to the approved state.</span>
            </button>
            <button
              type="button"
              class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              @click="() => triggerAndClose('markPending')"
            >
              <span class="font-medium text-zinc-900">Mark pending</span>
              <span class="text-xs text-zinc-500">Return posts to review mode for edits.</span>
            </button>
            <button
              type="button"
              class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              @click="() => triggerAndClose('reject')"
            >
              <span class="font-medium text-zinc-900">Reject</span>
              <span class="text-xs text-zinc-500">Flag posts to revisit or discard later.</span>
            </button>
            <button
              type="button"
              class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              @click="() => triggerAndClose('openRegenerate')"
            >
              <span class="font-medium text-zinc-900">Regenerate</span>
              <span class="text-xs text-zinc-500">Create fresh drafts based on the current selection.</span>
            </button>
            <button
              type="button"
              class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              @click="() => triggerAndClose('bulkUnschedule')"
            >
              <span class="font-medium text-zinc-900">Unschedule</span>
              <span class="text-xs text-zinc-500">Remove scheduled send times from these posts.</span>
            </button>
            <button
              type="button"
              class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!props.canBulkAutoSchedule || props.bulkAutoScheduling"
              @click="() => triggerAndClose('autoSchedule')"
            >
              <span class="flex items-center gap-2 font-medium text-zinc-900">
                <span>Auto-schedule approved</span>
                <span
                  v-if="props.bulkAutoScheduling"
                  class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-400/70 border-t-transparent"
                  aria-hidden="true"
                />
              </span>
              <span class="text-xs text-zinc-500">
                Queue approved posts for the next available times.
              </span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>
