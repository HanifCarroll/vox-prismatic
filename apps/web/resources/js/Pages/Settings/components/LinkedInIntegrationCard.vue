<script setup>
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
          <Button v-if="props.connected" variant="secondary" size="sm" :disabled="props.disconnecting" @click="() => emit('disconnect')">
            <span v-if="props.disconnecting" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-transparent"></span>
            Disconnect
          </Button>
          <Button v-else size="sm" @click="() => emit('connect')">Connect LinkedIn</Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
