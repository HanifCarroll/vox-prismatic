<script setup>
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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
      <Button size="sm" :disabled="props.bulkActionDisabled" @click="() => emit('approve')">Approve</Button>
      <Button size="sm" variant="outline" :disabled="props.bulkActionDisabled" @click="() => emit('markPending')">Mark Pending</Button>
      <Button size="sm" variant="destructive" :disabled="props.bulkActionDisabled" @click="() => emit('reject')">Reject</Button>
      <Button size="sm" variant="secondary" :disabled="props.bulkActionDisabled" @click="() => emit('openRegenerate')">Regenerate</Button>
      <Button size="sm" variant="outline" :disabled="props.bulkActionDisabled" @click="() => emit('bulkUnschedule')">Unschedule</Button>
      <Button size="sm" :disabled="!props.canBulkAutoSchedule || props.bulkAutoScheduling" @click="() => emit('autoSchedule')">
        <span v-if="props.bulkAutoScheduling" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-transparent"></span>
        Auto-schedule Approved
      </Button>
    </div>
  </div>
</template>
