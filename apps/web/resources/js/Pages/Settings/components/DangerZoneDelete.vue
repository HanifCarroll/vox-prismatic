<script setup>
import { computed } from 'vue';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const props = defineProps({
  show: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false },
  password: { type: String, default: '' },
});
const emit = defineEmits(['open', 'close', 'delete', 'update:password']);

const canConfirm = computed(() => props.password.length > 0 && !props.deleting);
</script>

<template>
  <Card>
    <template #title>
      <span class="text-red-700">Delete Account</span>
    </template>
    <template #subtitle>
      <span class="text-sm text-zinc-600">Permanently deletes your account and all associated data. This action cannot be undone.</span>
    </template>
    <template #content>
      <div class="flex items-center justify-end">
        <PrimeButton severity="danger" size="small" label="Delete Account" @click="() => emit('open')" />
      </div>
    </template>
  </Card>

  <Dialog v-model:visible="props.show" modal :closable="!props.deleting" header="Delete Account" :style="{ width: '28rem' }">
    <div class="space-y-3">
      <p class="text-sm text-zinc-700">Enter your current password to confirm account deletion. This action cannot be undone.</p>
      <div class="flex flex-col gap-2">
        <label for="modal-current-password" class="text-sm font-medium text-zinc-700">Current password</label>
        <InputText id="modal-current-password" :value="props.password" type="password" autocomplete="current-password" @input="(e) => emit('update:password', e.target.value)" />
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <PrimeButton label="Cancel" size="small" severity="secondary" :disabled="props.deleting" @click="() => emit('close')" />
        <PrimeButton label="Delete" size="small" severity="danger" :disabled="!canConfirm" :loading="props.deleting" @click="() => emit('delete')" />
      </div>
    </template>
  </Dialog>
</template>
