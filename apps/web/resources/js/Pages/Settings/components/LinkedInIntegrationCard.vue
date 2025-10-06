<script setup>
import Card from 'primevue/card';

const props = defineProps({
  connected: { type: Boolean, default: false },
  disconnecting: { type: Boolean, default: false },
});
const emit = defineEmits(['connect', 'disconnect']);
</script>

<template>
  <Card>
    <template #title>LinkedIn</template>
    <template #subtitle>
      <span class="text-sm text-zinc-600">Connect your LinkedIn account to publish directly.</span>
    </template>
    <template #content>
      <div class="flex items-center justify-between">
        <span class="text-sm text-zinc-700">
          {{ props.connected ? 'Connected' : 'Not connected' }}
        </span>
        <div class="flex items-center gap-2">
          <PrimeButton
            v-if="props.connected"
            severity="secondary"
            size="small"
            :loading="props.disconnecting"
            label="Disconnect"
            @click="() => emit('disconnect')"
          />
          <PrimeButton
            v-else
            size="small"
            label="Connect LinkedIn"
            @click="() => emit('connect')"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

