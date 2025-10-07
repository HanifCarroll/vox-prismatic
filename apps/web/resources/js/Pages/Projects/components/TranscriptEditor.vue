<script setup>
import { nextTick, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';

const props = defineProps({
  form: { type: Object, required: true },
});

const emit = defineEmits(['save', 'reset']);

const titleRef = ref(null);
const transcriptRef = ref(null);
const attempted = ref(false);

const focusFirstError = (errors) => {
  if (!attempted.value) return;
  nextTick(() => {
    if (errors.title && titleRef.value) {
      titleRef.value.focus();
      titleRef.value.select?.();
      return;
    }
    if (errors.transcript && transcriptRef.value) {
      transcriptRef.value.focus();
    }
  });
};

watch(
  () => props.form.errors,
  (errors) => focusFirstError(errors),
  { deep: true },
);

const onSave = () => {
  attempted.value = true;
  emit('save');
};

</script>

<template>
  <section class="space-y-4 rounded-b-md border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
    <div class="space-y-3">
      <div class="space-y-2">
        <label for="project-title-input" class="block text-sm font-medium text-zinc-800">Title</label>
        <input
          id="project-title-input"
          ref="titleRef"
          v-model="form.title"
          class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          placeholder="Give your project a title…"
          autocomplete="off"
        />
        <p v-if="form.errors.title" class="text-sm text-red-600" role="alert">{{ form.errors.title }}</p>
      </div>
      <div class="space-y-2">
        <label for="project-transcript-input" class="block text-sm font-medium text-zinc-800">Transcript</label>
        <textarea
          id="project-transcript-input"
          ref="transcriptRef"
          v-model="form.transcript"
          rows="16"
          required
          class="w-full resize-y rounded-md border border-zinc-300 px-3 py-3 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          aria-describedby="project-transcript-help"
          @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !form.processing) { e.preventDefault(); onSave(); } }"
        ></textarea>
        <p id="project-transcript-help" class="text-xs text-zinc-500" :class="{ hidden: !!form.errors.transcript }">
          Editing the transcript does not regenerate posts automatically.
        </p>
        <p v-if="form.errors.transcript" class="text-sm text-red-600" role="alert">{{ form.errors.transcript }}</p>
      </div>
      <div class="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="inline-flex items-center gap-2"
          @click="() => emit('reset')"
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          class="inline-flex items-center gap-2"
          :disabled="form.processing"
          @click="onSave"
        >
          <svg v-if="form.processing" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="9" class="opacity-25" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v6l4 2" />
          </svg>
          <span>{{ form.processing ? 'Saving…' : 'Save changes' }}</span>
        </Button>
      </div>
    </div>
  </section>
</template>
