<script setup>
import { Button } from '@/components/ui/button';

const props = defineProps({
  activeTab: { type: String, default: 'transcript' },
});
const emit = defineEmits(['change']);

const tabs = ['transcript', 'posts'];
</script>

<template>
  <nav class="flex gap-1 border-b border-zinc-200" aria-label="Project sections">
    <Button
      v-for="tab in tabs"
      :key="tab"
      type="button"
      variant="ghost"
      size="sm"
      class="rounded-none border-b-2 px-3 py-2 text-sm font-medium"
      :class="props.activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'"
      :aria-current="props.activeTab === tab ? 'page' : undefined"
      @click="() => { if (props.activeTab !== tab) emit('change', tab); }"
    >
      {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
    </Button>
  </nav>
</template>
