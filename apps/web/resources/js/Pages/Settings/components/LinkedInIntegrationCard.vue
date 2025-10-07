<script setup>
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const props = defineProps({
  connected: { type: Boolean, default: false },
  disconnecting: { type: Boolean, default: false },
});
const emit = defineEmits(['connect', 'disconnect']);
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>LinkedIn</CardTitle>
      <CardDescription>Connect your LinkedIn account to publish directly.</CardDescription>
    </CardHeader>
    <CardContent>
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
    </CardContent>
  </Card>
</template>
