<script setup>
import { computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const props = defineProps({
  visible: { type: Boolean, default: false },
  confirmValue: { type: String, default: '' },
  canSubmit: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: null },
});

const emit = defineEmits(['update:visible', 'update:confirmValue', 'submit', 'cancel']);

const openModel = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="sm:max-w-[28rem]">
      <DialogHeader>
        <DialogTitle>Delete account</DialogTitle>
        <DialogDescription>
          This permanently removes the user, their projects, generated posts, and usage history. This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="() => emit('submit')">
        <div>
          <label for="admin-delete-confirm" class="text-sm font-medium text-zinc-700">Type DELETE to confirm</label>
          <input
            id="admin-delete-confirm"
            :value="props.confirmValue"
            @input="(e) => emit('update:confirmValue', e.target.value)"
            type="text"
            autocomplete="off"
            spellcheck="false"
            class="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            placeholder="DELETE"
            aria-describedby="admin-delete-help"
          />
          <p id="admin-delete-help" class="mt-1 text-xs text-zinc-500">Deletion requires confirmation to prevent mistakes.</p>
        </div>

        <p v-if="props.error" class="text-sm text-rose-600">{{ props.error }}</p>

        <DialogFooter class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            @click="() => emit('cancel')"
            :disabled="props.submitting"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="props.submitting || !props.canSubmit"
          >
            <span v-if="props.submitting" class="inline-flex h-2 w-2 rounded-full bg-white/80"></span>
            <span>{{ props.submitting ? 'Deleting…' : 'Delete' }}</span>
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
