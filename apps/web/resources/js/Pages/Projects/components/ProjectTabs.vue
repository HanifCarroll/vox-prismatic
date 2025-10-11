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
      class="rounded-none border-x-0 border-t-0 border-b-2 px-3 py-2 text-sm font-medium shadow-none"
      :class="props.activeTab === tab
        ? 'border-b-zinc-900 text-zinc-900'
        : 'border-b-transparent text-zinc-600 hover:border-b-zinc-300 hover:text-zinc-900'"
      :aria-current="props.activeTab === tab ? 'page' : undefined"
      @click="() => { if (props.activeTab !== tab) emit('change', tab); }"
    >
      {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
    </Button>
  </nav>
</template>
