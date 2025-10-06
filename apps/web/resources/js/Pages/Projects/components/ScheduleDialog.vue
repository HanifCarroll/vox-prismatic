<script setup>
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';

const props = defineProps({
  visible: { type: Boolean, default: false },
  scheduleDate: { type: [Date, String, Number, null], default: null },
  isScheduling: { type: Boolean, default: false },
  canUnschedule: { type: Boolean, default: false },
  isUnscheduling: { type: Boolean, default: false },
});
const emit = defineEmits(['update:visible', 'update:scheduleDate', 'schedule', 'unschedule']);
</script>

<template>
  <Dialog v-model:visible="props.visible" modal header="Schedule Post" :style="{ width: '24rem' }" @update:visible="(v) => emit('update:visible', v)">
    <div class="space-y-4">
      <DatePicker :modelValue="props.scheduleDate" @update:modelValue="(v) => emit('update:scheduleDate', v)" showTime hourFormat="24" class="w-full" placeholder="Pick date & time" />
      <div class="flex items-center justify-end gap-2">
        <PrimeButton label="Unschedule" severity="danger" outlined size="small" :disabled="!props.canUnschedule || props.isUnscheduling" @click="() => emit('unschedule')" />
        <PrimeButton label="Schedule" size="small" :loading="props.isScheduling" :disabled="!props.scheduleDate" @click="() => emit('schedule')" />
      </div>
    </div>
  </Dialog>
</template>

