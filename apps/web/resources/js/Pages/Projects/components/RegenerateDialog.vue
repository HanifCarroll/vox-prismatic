<script setup>
import { computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const props = defineProps({
  visible: { type: Boolean, default: false },
  regenPostType: { type: String, default: '' },
  regenCustom: { type: String, default: '' },
  presetOptions: { type: Array, default: () => [] },
  selectedPresetHint: { type: String, default: '' },
  isRegenerating: { type: Boolean, default: false },
});
const emit = defineEmits(['update:visible', 'update:regenPostType', 'update:regenCustom', 'regenerate']);

const openModel = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="sm:max-w-[28rem]">
      <DialogHeader>
        <DialogTitle>Regenerate Posts</DialogTitle>
        <DialogDescription>Optionally provide custom guidance for regeneration.</DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
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
        <input :value="props.regenCustom" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" placeholder="e.g., Emphasize a contrarian angle" @input="(e) => emit('update:regenCustom', e.target.value)" />
      </div>
      <DialogFooter class="mt-4">
        <div class="flex items-center justify-end gap-2">
          <PrimeButton label="Cancel" outlined size="small" @click="() => emit('update:visible', false)" />
          <PrimeButton label="Regenerate" size="small" :loading="props.isRegenerating" @click="() => emit('regenerate')" />
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
