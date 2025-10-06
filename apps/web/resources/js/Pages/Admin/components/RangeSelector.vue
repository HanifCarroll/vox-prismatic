<script setup>
const props = defineProps({
  options: { type: Array, default: () => [] },
  selected: { type: String, default: '30d' },
});
const emit = defineEmits(['change', 'refresh']);
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="inline-flex rounded-md border border-zinc-300 p-0.5 text-sm">
      <button
        v-for="option in props.options"
        :key="option.key"
        type="button"
        class="rounded px-2 py-1 font-medium transition"
        :class="props.selected === option.key ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'"
        @click="() => emit('change', option.key)"
      >
        {{ option.label }}
      </button>
    </div>
    <button type="button" class="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100" @click="() => emit('refresh')">
      Refresh
    </button>
  </div>
</template>

