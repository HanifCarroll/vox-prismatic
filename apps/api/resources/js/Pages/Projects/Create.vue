<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { nextTick, ref, watch } from 'vue';

const titleRef = ref(null);
const transcriptRef = ref(null);
const attempted = ref(false);

const form = useForm({
    title: '',
    transcript: '',
});

const focusFirstError = (errors) => {
    if (!attempted.value) {
        return;
    }

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
    () => form.errors,
    (errors) => focusFirstError(errors),
    { deep: true },
);

const submit = () => {
    attempted.value = true;
    form.post('/projects', {
        preserveScroll: true,
    });
};
</script>

<template>
    <AppLayout title="New project">
        <Head title="New project" />
        <form class="mx-auto max-w-3xl space-y-8" @submit.prevent="submit" novalidate>
            <div class="space-y-2">
                <label for="project-title" class="block text-sm font-medium text-zinc-800">Project title</label>
                <input
                    id="project-title"
                    ref="titleRef"
                    v-model.trim="form.title"
                    type="text"
                    maxlength="255"
                    class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    placeholder="Founder update — March 2025"
                />
                <p class="text-xs text-zinc-500">Optional. We’ll default to “Untitled Project” if you leave this blank.</p>
                <p
                    v-if="form.errors.title"
                    class="text-sm text-red-600"
                    role="alert"
                >
                    {{ form.errors.title }}
                </p>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                    <label for="project-transcript" class="font-medium text-zinc-800">Transcript</label>
                    <span class="text-xs text-zinc-500">Paste raw text or meeting notes (minimum 10 characters).</span>
                </div>
                <textarea
                    id="project-transcript"
                    ref="transcriptRef"
                    v-model="form.transcript"
                    rows="14"
                    required
                    class="w-full resize-y rounded-md border border-zinc-300 px-3 py-3 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    placeholder="Start with the transcript you’d like to turn into LinkedIn posts…"
                ></textarea>
                <p
                    id="project-transcript-help"
                    class="text-xs text-zinc-500"
                    :class="{ hidden: !!form.errors.transcript }"
                >
                    You can include timestamps, speaker labels, or bullet notes—we’ll clean it up.
                </p>
                <p
                    v-if="form.errors.transcript"
                    class="text-sm text-red-600"
                    role="alert"
                >
                    {{ form.errors.transcript }}
                </p>
            </div>

            <div class="flex items-center justify-end gap-2">
                <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    @click="form.reset()"
                >
                    Clear
                </button>
                <PrimeButton
                    type="submit"
                    label="Create project"
                    :loading="form.processing"
                    class="!bg-zinc-900 !border-none !px-4 !py-2 !text-sm !font-medium !text-white !rounded-md hover:!bg-zinc-800 focus-visible:!ring-2 focus-visible:!ring-offset-2 focus-visible:!ring-zinc-900"
                />
            </div>
        </form>
    </AppLayout>
</template>
