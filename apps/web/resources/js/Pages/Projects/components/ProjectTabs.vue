<script setup>
const props = defineProps({
  activeTab: { type: String, default: 'transcript' },
});
const emit = defineEmits(['change']);

const tabs = ['transcript', 'posts'];
</script>

<template>
  <nav class="flex gap-1 border-b border-zinc-200" aria-label="Project sections">
    <button
      v-for="tab in tabs"
      :key="tab"
      type="button"
      class="rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition"
      :class="props.activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'"
      :aria-current="props.activeTab === tab ? 'page' : undefined"
      @click="() => { if (props.activeTab !== tab) emit('change', tab); }"
    >
      {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
    </button>
  </nav>
</template>

