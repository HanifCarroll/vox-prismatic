<script setup>
import { computed, nextTick, ref, watch } from 'vue';
// Use the standard DialogContent. The scroll variant caused
// stacking/visibility issues inside the project detail view.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const props = defineProps({
  visible: { type: Boolean, default: false },
  // Bind to a local datetime string (YYYY-MM-DDTHH:MM) in the user's timezone.
  scheduleDate: { type: String, default: '' },
  isScheduling: { type: Boolean, default: false },
  canUnschedule: { type: Boolean, default: false },
  isUnscheduling: { type: Boolean, default: false },
  // Minimum selectable time (YYYY-MM-DDTHH:MM) in the user's timezone
  minScheduleTime: { type: String, default: '' },
  helperText: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
});
const emit = defineEmits(['update:visible', 'update:scheduleDate', 'schedule', 'unschedule', 'useMinimum']);

const openModel = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

const inputId = `schedule-datetime-${Math.random().toString(36).slice(2, 8)}`;
const helperId = `${inputId}-helper`;
const errorId = `${inputId}-error`;

const inputRef = ref(null);

watch(
  () => props.errorMessage,
  (message) => {
    if (message) {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  },
);

const describedBy = computed(() => {
  const ids = [];
  if (props.helperText) ids.push(helperId);
  if (props.errorMessage) ids.push(errorId);
  return ids.join(' ') || undefined;
});

const showUseMinimum = computed(() => Boolean(props.minScheduleTime));

const inputClass = computed(() => {
  const base = 'w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900';
  if (props.errorMessage) {
    return `${base} border-red-500 focus-visible:outline-red-600`;
  }
  return `${base} border-zinc-300`;
});
</script>

<template>
  <Dialog v-model:open="openModel">
    <!-- Force a solid background to avoid translucency on some pages -->
    <DialogContent class="sm:max-w-[24rem] bg-white dark:bg-zinc-900">
      <DialogHeader>
        <DialogTitle>Schedule Post</DialogTitle>
        <DialogDescription>
          Choose a future date and time for publishing.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <input
            :id="inputId"
            ref="inputRef"
            :value="props.scheduleDate || ''"
            @input="(e) => emit('update:scheduleDate', e.target.value || '')"
            type="datetime-local"
            :min="props.minScheduleTime || ''"
            :class="inputClass"
            :aria-describedby="describedBy"
            :aria-invalid="props.errorMessage ? 'true' : undefined"
            placeholder="Pick date & time"
          />
          <div class="flex flex-wrap items-start justify-between gap-2">
            <p v-if="props.helperText" :id="helperId" class="text-xs text-zinc-500" aria-live="polite">{{ props.helperText }}</p>
            <Button v-if="showUseMinimum" type="button" variant="link" size="sm" class="px-0" @click="() => emit('useMinimum')">
              Use earliest allowed time
            </Button>
          </div>
          <p
            v-if="props.errorMessage"
            :id="errorId"
            class="text-xs text-red-600"
            role="alert"
            aria-live="assertive"
          >
            {{ props.errorMessage }}
          </p>
        </div>
        <div class="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" :disabled="!props.canUnschedule || props.isUnscheduling" @click="() => emit('unschedule')">Unschedule</Button>
          <Button size="sm" :disabled="!props.scheduleDate || props.isScheduling" @click="() => emit('schedule')">
            <span v-if="props.isScheduling" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
            Schedule
          </Button>
        </div>
      </div>
      <DialogFooter />
    </DialogContent>
  </Dialog>
</template>
