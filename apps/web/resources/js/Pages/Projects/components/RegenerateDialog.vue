<script setup>
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const props = defineProps({
  visible: { type: Boolean, default: false },
  regenPostType: { type: String, default: '' },
  regenCustom: { type: String, default: '' },
  presetOptions: { type: Array, default: () => [] },
  selectedPresetHint: { type: String, default: '' },
  isRegenerating: { type: Boolean, default: false },
});
const emit = defineEmits(['update:visible', 'update:regenPostType', 'update:regenCustom', 'regenerate']);
</script>

<template>
  <Dialog v-model:visible="props.visible" modal header="Regenerate Posts" :style="{ width: '28rem' }" @update:visible="(v) => emit('update:visible', v)">
    <div class="space-y-3">
      <p class="text-sm text-zinc-600">Optionally provide custom guidance for regeneration.</p>
      <div class="space-y-2">
        <label for="regen-post-type" class="block text-sm font-medium text-zinc-700">Post type (optional)</label>
        <select
          id="regen-post-type"
          :value="props.regenPostType"
          @change="(e) => emit('update:regenPostType', e.target.value)"
          class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-600 focus:outline-none focus:ring focus:ring-zinc-500/40"
        >
          <option v-for="option in props.presetOptions" :key="option.value || 'none'" :value="option.value">{{ option.label }}</option>
        </select>
        <p v-if="props.regenPostType && props.selectedPresetHint" class="text-xs text-zinc-500">{{ props.selectedPresetHint }}</p>
      </div>
      <InputText :value="props.regenCustom" class="w-full" placeholder="e.g., Emphasize a contrarian angle" @input="(e) => emit('update:regenCustom', e.target.value)" />
      <div class="flex items-center justify-end gap-2">
        <PrimeButton label="Cancel" outlined size="small" @click="() => emit('update:visible', false)" />
        <PrimeButton label="Regenerate" size="small" :loading="props.isRegenerating" @click="() => emit('regenerate')" />
      </div>
    </div>
  </Dialog>
</template>

