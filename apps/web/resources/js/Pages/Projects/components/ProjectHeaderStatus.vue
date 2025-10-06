<script setup>
import { computed } from 'vue';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';

const props = defineProps({
  title: { type: String, default: 'Project' },
  createdAt: { type: [String, Number, Date], default: null },
  updatedAt: { type: [String, Number, Date], default: null },
  stage: { type: String, default: 'processing' },
  progress: { type: Number, default: 0 },
  step: { type: String, default: null },
  processingError: { type: String, default: null },
  isRealtimeUnavailable: { type: Boolean, default: false },
  isDeleting: { type: Boolean, default: false },
});

const emit = defineEmits(['delete']);

const formattedStage = computed(() => {
  switch (props.stage) {
    case 'processing':
      return { label: 'Processing', classes: 'border-amber-200 bg-amber-100 text-amber-800' };
    case 'posts':
      return { label: 'Posts', classes: 'border-blue-200 bg-blue-100 text-blue-800' };
    case 'ready':
      return { label: 'Ready', classes: 'border-emerald-200 bg-emerald-100 text-emerald-800' };
    default:
      return { label: props.stage ?? 'Processing', classes: 'border-zinc-200 bg-zinc-100 text-zinc-700' };
  }
});

const formattedStep = computed(() => {
  if (!props.step) return null;
  return props.step.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
});
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold text-zinc-900">{{ title || 'Untitled Project' }}</h2>
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="formattedStage.classes"
          >
            {{ formattedStage.label }}
          </span>
        </div>
        <dl class="flex flex-wrap gap-4 text-xs text-zinc-500">
          <div class="flex items-center gap-1" v-if="createdAt">
            <dt class="font-medium text-zinc-700">Created</dt>
            <dd>{{ formatDateTime(createdAt) }}</dd>
          </div>
          <div class="flex items-center gap-1" v-if="updatedAt">
            <dt class="font-medium text-zinc-700">Updated</dt>
            <dd>{{ formatRelativeTime(updatedAt) }}</dd>
          </div>
        </dl>
        <div v-if="stage === 'processing'" class="space-y-1">
          <div class="flex items-center justify-between text-xs text-zinc-500">
            <span>{{ formattedStep ?? 'Processing…' }}</span>
            <span>{{ Math.round(progress) }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              class="h-full rounded-full bg-zinc-900 transition-all"
              :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
            ></div>
          </div>
        </div>
        <p v-if="processingError" class="text-sm text-red-600" role="alert">{{ processingError }}</p>
        <p v-if="isRealtimeUnavailable" class="text-xs text-amber-700" role="status">
          Realtime connection lost. Re-syncing when connection is restored…
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <PrimeButton
          type="button"
          label="Delete project"
          severity="danger"
          outlined
          :loading="isDeleting"
          class="!px-3 !py-2 !text-sm !font-medium !rounded-md"
          @click="() => emit('delete')"
        />
      </div>
    </div>
  </div>
  
</template>

