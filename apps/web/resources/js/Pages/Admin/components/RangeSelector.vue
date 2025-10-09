<script setup>
import { Button } from '@/components/ui/button';

const props = defineProps({
  options: { type: Array, default: () => [] },
  selected: { type: String, default: '30d' },
  refreshDisabled: { type: Boolean, default: false },
});
const emit = defineEmits(['change', 'refresh']);
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="inline-flex rounded-md border border-zinc-300 p-0.5 text-sm">
      <Button
        v-for="option in props.options"
        :key="option.key"
        type="button"
        size="sm"
        :variant="props.selected === option.key ? 'default' : 'ghost'"
        class="px-2 py-1"
        @click="() => emit('change', option.key)"
      >
        {{ option.label }}
      </Button>
    </div>
    <Button type="button" variant="outline" size="sm" :disabled="props.refreshDisabled" @click="() => emit('refresh')">
      Refresh
    </Button>
  </div>
</template>
