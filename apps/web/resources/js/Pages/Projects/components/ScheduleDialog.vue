<script setup>
import { computed } from 'vue';
// Use the standard DialogContent. The scroll variant caused
// stacking/visibility issues inside the project detail view.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const props = defineProps({
  visible: { type: Boolean, default: false },
  scheduleDate: { type: [Date, String, Number, null], default: null },
  isScheduling: { type: Boolean, default: false },
  canUnschedule: { type: Boolean, default: false },
  isUnscheduling: { type: Boolean, default: false },
});
const emit = defineEmits(['update:visible', 'update:scheduleDate', 'schedule', 'unschedule']);

const openModel = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
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
        <input
          :value="props.scheduleDate ? new Date(props.scheduleDate).toISOString().slice(0,16) : ''"
          @input="(e) => emit('update:scheduleDate', e.target.value ? new Date(e.target.value) : null)"
          type="datetime-local"
          class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          placeholder="Pick date & time"
        />
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
