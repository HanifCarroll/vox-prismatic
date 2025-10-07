<script setup>
import { Checkbox } from '@/components/ui/checkbox';

const props = defineProps({
  allSelected: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  bulkActionDisabled: { type: Boolean, default: false },
  canBulkAutoSchedule: { type: Boolean, default: false },
  bulkAutoScheduling: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:allSelected',
  'approve',
  'markPending',
  'reject',
  'openRegenerate',
  'bulkUnschedule',
  'autoSchedule',
]);
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 text-sm text-zinc-700">
      <Checkbox :indeterminate="indeterminate" :modelValue="props.allSelected" @update:modelValue="(val) => emit('update:allSelected', val)" />
      <span>{{ props.selectedCount > 0 ? `${props.selectedCount} selected` : `${props.totalCount} posts` }}</span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <PrimeButton size="small" label="Approve" :disabled="props.bulkActionDisabled" @click="() => emit('approve')" />
      <PrimeButton size="small" label="Mark Pending" outlined :disabled="props.bulkActionDisabled" @click="() => emit('markPending')" />
      <PrimeButton size="small" label="Reject" severity="danger" outlined :disabled="props.bulkActionDisabled" @click="() => emit('reject')" />
      <PrimeButton size="small" label="Regenerate" severity="secondary" :disabled="props.bulkActionDisabled" @click="() => emit('openRegenerate')" />
      <PrimeButton size="small" label="Unschedule" severity="danger" outlined :disabled="props.bulkActionDisabled" @click="() => emit('bulkUnschedule')" />
      <PrimeButton size="small" label="Auto-schedule Approved" :disabled="!props.canBulkAutoSchedule || props.bulkAutoScheduling" :loading="props.bulkAutoScheduling" @click="() => emit('autoSchedule')" />
    </div>
  </div>
</template>
