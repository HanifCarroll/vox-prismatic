<script setup>
import { computed } from 'vue';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const props = defineProps({
  show: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false },
  password: { type: String, default: '' },
});
const emit = defineEmits(['open', 'close', 'delete', 'update:password']);

  const canConfirm = computed(() => props.password.length > 0 && !props.deleting);
  const openModel = computed({
    get: () => props.show,
    set: (v) => emit('update:visible', v),
  });
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-red-700">Delete Account</CardTitle>
      <CardDescription>Permanently deletes your account and all associated data. This action cannot be undone.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex items-center justify-end">
        <PrimeButton severity="danger" size="small" label="Delete Account" @click="() => emit('open')" />
      </div>
    </CardContent>
  </Card>

  <Dialog v-model:open="openModel">
    <DialogContent class="sm:max-w-[28rem]">
      <DialogHeader>
        <DialogTitle>Delete Account</DialogTitle>
      </DialogHeader>
      <div class="space-y-3">
        <p class="text-sm text-zinc-700">Enter your current password to confirm account deletion. This action cannot be undone.</p>
        <div class="flex flex-col gap-2">
          <label for="modal-current-password" class="text-sm font-medium text-zinc-700">Current password</label>
          <input id="modal-current-password" :value="props.password" type="password" autocomplete="current-password" @input="(e) => emit('update:password', e.target.value)" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
        </div>
      </div>
      <DialogFooter>
        <div class="flex items-center justify-end gap-2">
          <PrimeButton label="Cancel" size="small" severity="secondary" :disabled="props.deleting" @click="() => emit('close')" />
          <PrimeButton label="Delete" size="small" severity="danger" :disabled="!canConfirm" :loading="props.deleting" @click="() => emit('delete')" />
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
