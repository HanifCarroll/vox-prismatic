<script setup>
import { computed } from 'vue';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';
import { formatProcessingStep } from '@/utils/processing';
import { Button } from '@/components/ui/button';

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

const formattedStep = computed(() => formatProcessingStep(props.step));
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="space-y-2">
        <h2 class="text-xl font-semibold text-zinc-900">{{ title || 'Untitled Project' }}</h2>
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
            <span>{{ formattedStep ?? 'Processing transcript…' }}</span>
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
        <Button
          type="button"
          variant="destructive"
          size="sm"
          :disabled="isDeleting"
          @click="() => emit('delete')"
        >
          <span v-if="isDeleting" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
          Delete project
        </Button>
      </div>
    </div>
  </div>
  
</template>
