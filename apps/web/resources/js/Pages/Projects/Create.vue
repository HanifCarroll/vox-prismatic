<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { nextTick, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import analytics from '@/lib/analytics';

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
    const transcriptLen = (form.transcript ?? '').length;
    form.post('/projects', {
        preserveScroll: true,
        onSuccess: () => {
            analytics.capture('app.project_created', {
                title_present: Boolean(form.title && form.title.trim() !== ''),
                transcript_len_bucket: transcriptLen >= 2000 ? '2000+' : transcriptLen >= 1000 ? '1000-1999' : transcriptLen >= 500 ? '500-999' : transcriptLen >= 200 ? '200-499' : '0-199',
            });
        },
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
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="inline-flex items-center gap-2"
                    @click="form.reset()"
                >
                    Clear
                </Button>
                <Button
                    type="submit"
                    :disabled="form.processing"
                    class="inline-flex items-center"
                >
                    <span v-if="form.processing" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                    Create project
                </Button>
            </div>
        </form>
    </AppLayout>
</template>
