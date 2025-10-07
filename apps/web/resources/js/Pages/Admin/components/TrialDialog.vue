<script setup>
import { computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const props = defineProps({
  visible: { type: Boolean, default: false },
  trialEndsAt: { type: String, default: '' },
  trialNotes: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: null },
});

const emit = defineEmits([
  'update:visible',
  'update:trialEndsAt',
  'update:trialNotes',
  'setDays',
  'clear',
  'submit',
  'cancel',
]);

const openModel = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="sm:max-w-[32rem]">
      <DialogHeader>
        <DialogTitle>Manage trial</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="() => emit('submit')">
        <div>
          <label for="trial-ends-at" class="text-sm font-medium text-zinc-700">Trial end</label>
          <input
            id="trial-ends-at"
            :value="props.trialEndsAt"
            @input="(e) => emit('update:trialEndsAt', e.target.value)"
            type="datetime-local"
            class="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          />
          <div class="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
            <button type="button" class="rounded-full border border-zinc-300 px-3 py-1 transition hover:bg-zinc-100" @click="() => emit('setDays', 7)">+7 days</button>
            <button type="button" class="rounded-full border border-zinc-300 px-3 py-1 transition hover:bg-zinc-100" @click="() => emit('setDays', 14)">+14 days</button>
            <button type="button" class="rounded-full border border-zinc-300 px-3 py-1 transition hover:bg-zinc-100" @click="() => emit('clear')">Clear</button>
          </div>
        </div>
        <div>
          <label for="trial-notes" class="text-sm font-medium text-zinc-700">Notes</label>
          <textarea
            id="trial-notes"
            :value="props.trialNotes"
            @input="(e) => emit('update:trialNotes', e.target.value)"
            maxlength="500"
            rows="4"
            class="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            placeholder="Add internal notes…"
          ></textarea>
          <div class="mt-1 flex justify-between text-xs text-zinc-500">
            <span>Max 500 characters.</span>
            <span>{{ (props.trialNotes || '').length }}/500</span>
          </div>
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
            class="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="props.submitting"
          >
            <span v-if="props.submitting" class="inline-flex h-2 w-2 rounded-full bg-white/80"></span>
            <span>{{ props.submitting ? 'Saving…' : 'Save changes' }}</span>
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
