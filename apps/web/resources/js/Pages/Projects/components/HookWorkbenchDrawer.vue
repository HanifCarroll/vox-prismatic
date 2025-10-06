<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';
import {
    clampHookCount,
    deriveHookFromContent,
    limitFrameworkSelection,
    mergeHookIntoContent,
    normalizeHook,
} from '../utils/hookWorkbench';

const props = defineProps({
    open: { type: Boolean, default: false },
    post: { type: Object, default: null },
    baseContent: { type: String, default: '' },
    onClose: { type: Function, default: () => {} },
    onApplyHook: { type: Function, required: true },
});

const toast = useToast();

const frameworks = ref([]);
const frameworksLoading = ref(false);
const frameworksError = ref('');
const selectedFrameworkIds = ref([]);
const customFocus = ref('');
const count = ref(3);
const generating = ref(false);
const requestError = ref('');
const hooksResponse = ref(null);
const previewId = ref(null);
const touched = ref(false);

let frameworksCache = null;
let frameworksPromise = null;

const fetchFrameworks = async () => {
    if (frameworksCache) {
        frameworks.value = frameworksCache.slice();
        frameworksLoading.value = false;
        frameworksError.value = '';
        return frameworks.value;
    }
    if (frameworksPromise) {
        return frameworksPromise;
    }
    frameworksLoading.value = true;
    frameworksError.value = '';
    frameworksPromise = window.axios
        .get('/hooks/frameworks')
        .then((response) => {
            const list = Array.isArray(response.data?.frameworks) ? response.data.frameworks : [];
            frameworksCache = list;
            frameworks.value = list.slice();
            return frameworks.value;
        })
        .catch((error) => {
            const fallback = error?.response?.data?.error ?? error?.message ?? 'Failed to load frameworks';
            frameworksError.value = fallback;
            return [];
        })
        .finally(() => {
            frameworksLoading.value = false;
            frameworksPromise = null;
        });
    return frameworksPromise;
};

const baseContent = computed(() => String(props.baseContent ?? ''));
const hooks = computed(() => (Array.isArray(hooksResponse.value?.hooks) ? hooksResponse.value.hooks : []));
const recommendedId = computed(() => hooksResponse.value?.recommendedId ?? null);
const summary = computed(() => hooksResponse.value?.summary ?? null);
const currentHook = computed(() => deriveHookFromContent(baseContent.value));
const previewHook = computed(() => hooks.value.find((hook) => hook.id === previewId.value) ?? null);
const previewContent = computed(() =>
    previewHook.value ? mergeHookIntoContent(baseContent.value, previewHook.value.hook) : baseContent.value,
);
const generateDisabled = computed(() => !props.post || selectedFrameworkIds.value.length === 0 || generating.value);
const customFocusLimit = 240;
const customFocusRemaining = computed(() => customFocusLimit - customFocus.value.length);

const closeDrawer = () => {
    props.onClose?.();
};

const resetTransientState = () => {
    hooksResponse.value = null;
    previewId.value = null;
    requestError.value = '';
    generating.value = false;
    touched.value = false;
};

watch(
    () => props.open,
    async (open) => {
        if (open) {
            await fetchFrameworks();
            if (frameworks.value.length === 0 && frameworksCache) {
                frameworks.value = frameworksCache.slice();
            }
            if (frameworks.value.length > 0 && selectedFrameworkIds.value.length === 0) {
                const defaults = frameworks.value.slice(0, Math.min(3, frameworks.value.length)).map((fw) => fw.id);
                selectedFrameworkIds.value = defaults;
            }
            nextTick(() => {
                const drawer = document.querySelector('.hook-workbench-drawer [data-autofocus]');
                if (drawer && typeof drawer.focus === 'function') {
                    drawer.focus();
                }
            });
        } else {
            resetTransientState();
            customFocus.value = '';
            count.value = 3;
        }
    },
    { immediate: true },
);

watch(
    () => props.post?.id,
    () => {
        resetTransientState();
        touched.value = false;
    },
);

const ensureSelectionWithinLimit = (nextId, checked) => {
    selectedFrameworkIds.value = limitFrameworkSelection(selectedFrameworkIds.value, nextId, checked);
    if (selectedFrameworkIds.value.length === 0) {
        touched.value = false;
    }
};

const parseErrorMessage = (error) => {
    if (error?.response?.data?.error) {
        return error.response.data.error;
    }
    if (error?.message) {
        return error.message;
    }
    return 'Failed to generate hooks';
};

const generateHooks = async () => {
    requestError.value = '';
    touched.value = true;
    if (!props.post) {
        requestError.value = 'Select a post to generate hooks.';
        return;
    }
    if (selectedFrameworkIds.value.length === 0) {
        requestError.value = 'Choose at least one framework to continue.';
        return;
    }
    const desiredCount = clampHookCount(count.value);
    count.value = desiredCount;
    generating.value = true;
    try {
        const payload = { count: desiredCount };
        if (selectedFrameworkIds.value.length > 0) {
            payload.frameworkIds = selectedFrameworkIds.value;
        }
        const trimmedFocus = normalizeHook(customFocus.value).slice(0, customFocusLimit);
        if (trimmedFocus) {
            payload.customFocus = trimmedFocus;
        }
        const response = await window.axios.post(`/posts/${props.post.id}/hooks/workbench`, payload);
        hooksResponse.value = response.data ?? null;
        const list = Array.isArray(response.data?.hooks) ? response.data.hooks : [];
        if (list.length === 0) {
            requestError.value = 'No hooks returned. Try again with different options.';
            return;
        }
        previewId.value = response.data?.recommendedId ?? list[0].id;
        toast.add({ severity: 'success', summary: 'Hooks generated', detail: 'Review the variants and pick a winner.', life: 4000 });
    } catch (error) {
        const message = parseErrorMessage(error);
        requestError.value = message;
        toast.add({ severity: 'error', summary: 'Failed to generate hooks', detail: message, life: 5000 });
    } finally {
        generating.value = false;
    }
};

const applyHook = (hook) => {
    if (!hook) {
        return;
    }
    props.onApplyHook?.(hook);
    toast.add({ severity: 'success', summary: 'Hook applied', detail: 'Opening line updated in the draft.', life: 3500 });
    closeDrawer();
};

const selectPreview = (hookId) => {
    previewId.value = hookId;
};

const generateHint = computed(() => {
    if (!touched.value) {
        return null;
    }
    if (selectedFrameworkIds.value.length === 0) {
        return 'Select between one and five frameworks.';
    }
    return null;
});

const dialogClasses = {
    root: 'hook-workbench-drawer',
    content: 'hook-workbench-content',
};

const handleVisibilityChange = (value) => {
    if (!value) {
        closeDrawer();
    }
};

onMounted(() => {
    if (props.open) {
        fetchFrameworks();
    }
});
</script>

<template>
    <Dialog
        :visible="open"
        modal
        position="right"
        :showHeader="false"
        :dismissableMask="false"
        :draggable="false"
        :blockScroll="true"
        :pt="dialogClasses"
        :style="{ width: 'min(780px, 90vw)' }"
        class="hook-workbench-shell"
        @update:visible="handleVisibilityChange"
    >
        <section class="flex h-[min(100vh-2rem,760px)] max-h-full flex-col gap-6 p-6" aria-label="Hook workbench panel">
            <header class="flex flex-col gap-2">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-lg font-semibold text-zinc-900">Hook workbench</h2>
                        <p class="text-sm text-zinc-600">
                            Generate opening lines, preview them with your draft, and drop the winner into the editor.
                        </p>
                    </div>
                    <button
                        type="button"
                        class="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        @click="closeDrawer"
                        aria-label="Close hook workbench"
                    >
                        Close
                    </button>
                </div>
                <div v-if="post" class="text-xs text-zinc-500">
                    Draft status: <span class="font-medium text-zinc-700 capitalize">{{ post.status ?? 'pending' }}</span>
                </div>
            </header>

            <div v-if="frameworksError" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {{ frameworksError }}
            </div>

            <div v-if="requestError" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {{ requestError }}
            </div>

            <div v-if="!post" class="flex flex-1 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500">
                Select a post from the queue to explore hook options.
            </div>

            <div v-else class="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[320px_1fr]">
                <aside class="flex h-full flex-col gap-4 overflow-hidden">
                    <div class="space-y-3 overflow-hidden rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                        <div class="flex items-center justify-between gap-2 text-xs text-zinc-500">
                            <span>{{ selectedFrameworkIds.length }} selected</span>
                            <button
                                type="button"
                                class="text-xs font-medium text-zinc-600 transition hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                                :disabled="frameworks.length === 0"
                                @click="() => { selectedFrameworkIds = frameworks.slice(0, Math.min(3, frameworks.length)).map((fw) => fw.id); }"
                            >
                                Reset
                            </button>
                        </div>
                        <div class="hook-scroll-area">
                            <div v-if="frameworksLoading" class="space-y-3 py-1">
                                <p class="text-xs text-zinc-500">Loading frameworks…</p>
                            </div>
                            <div v-else class="space-y-3">
                                <div
                                    v-for="framework in frameworks"
                                    :key="framework.id"
                                    class="cursor-pointer rounded-md border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300 focus-within:border-zinc-900"
                                >
                                    <label :for="`fw-${framework.id}`" class="flex items-center gap-2 text-sm font-medium text-zinc-800">
                                        <Checkbox
                                            :inputId="`fw-${framework.id}`"
                                            binary
                                            :modelValue="selectedFrameworkIds.includes(framework.id)"
                                            @update:modelValue="(val) => ensureSelectionWithinLimit(framework.id, val)"
                                        />
                                        <span>{{ framework.label }}</span>
                                    </label>
                                    <p class="mt-2 text-xs leading-relaxed text-zinc-600">{{ framework.description }}</p>
                                    <p v-if="framework.example" class="mt-2 text-xs font-medium text-zinc-500">Example: {{ framework.example }}</p>
                                    <div v-if="framework.tags?.length" class="mt-2 flex flex-wrap gap-1">
                                        <span
                                            v-for="tag in framework.tags"
                                            :key="tag"
                                            class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500"
                                        >
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p v-if="generateHint" class="text-xs text-red-600">{{ generateHint }}</p>
                    </div>

                    <div class="space-y-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                        <label class="block text-sm font-medium text-zinc-800" for="hook-count">Variants</label>
                        <InputNumber
                            id="hook-count"
                            v-model="count"
                            :min="3"
                            :max="5"
                            :step="1"
                            showButtons
                            input-class="hook-count-input"
                            aria-describedby="hook-count-help"
                        />
                        <p id="hook-count-help" class="text-xs text-zinc-500">Generate between 3 and 5 hooks per run.</p>
                    </div>

                    <div class="space-y-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                        <label class="block text-sm font-medium text-zinc-800" for="hook-focus">Custom focus (optional)</label>
                        <Textarea
                            id="hook-focus"
                            v-model="customFocus"
                            autoResize
                            :rows="3"
                            :maxlength="customFocusLimit"
                            class="w-full"
                            placeholder="Highlight a specific audience, objection, or proof point…"
                        />
                        <div class="flex items-center justify-between text-xs text-zinc-500">
                            <span>{{ Math.max(customFocusRemaining, 0) }} characters left</span>
                            <button
                                type="button"
                                class="text-xs font-medium text-zinc-600 transition hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                :disabled="customFocus.length === 0"
                                @click="() => { customFocus = ''; }"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div class="mt-auto space-y-2">
                        <PrimeButton
                            label="Generate hooks"
                            :disabled="generateDisabled"
                            :loading="generating"
                            class="w-full"
                            @click="generateHooks"
                            data-autofocus
                        />
                        <p class="text-xs text-zinc-500">The draft remains unchanged until you choose “Use hook”.</p>
                    </div>
                </aside>

                <article class="flex h-full flex-col gap-4 overflow-hidden rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-semibold text-zinc-900">Preview</h3>
                            <span v-if="previewHook" class="text-xs font-medium uppercase tracking-wide text-emerald-600">
                                {{ previewHook.id === recommendedId ? 'Recommended' : 'Previewing' }}
                            </span>
                        </div>
                        <p class="text-xs text-zinc-500">
                            Current opening: <span class="font-medium text-zinc-600">{{ currentHook || '—' }}</span>
                        </p>
                    </div>
                    <div class="grid flex-1 gap-4 overflow-hidden md:grid-cols-2">
                        <div class="flex h-full flex-col gap-2 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 p-3">
                            <h4 class="text-xs font-semibold uppercase tracking-wide text-zinc-600">Draft</h4>
                            <p class="hook-preview-text">{{ baseContent }}</p>
                        </div>
                        <div class="flex h-full flex-col gap-2 overflow-hidden rounded-md border border-sky-200 bg-sky-50 p-3">
                            <h4 class="text-xs font-semibold uppercase tracking-wide text-sky-700">With selected hook</h4>
                            <p class="hook-preview-text text-sky-900">{{ previewContent }}</p>
                        </div>
                    </div>

                    <div v-if="summary" class="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                        {{ summary }}
                    </div>

                    <div class="flex-1 overflow-y-auto">
                        <div v-if="hooks.length === 0" class="flex h-full items-center justify-center text-sm text-zinc-500">
                            Run the generator to get fresh hooks tailored to this draft.
                        </div>
                        <ul v-else class="space-y-3">
                            <li
                                v-for="hook in hooks"
                                :key="hook.id"
                                class="rounded-md border border-zinc-200 bg-white p-3 transition hover:border-zinc-300"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex-1">
                                        <p class="text-sm font-semibold text-zinc-900">{{ hook.hook }}</p>
                                        <p class="mt-2 text-xs text-zinc-600">{{ hook.rationale }}</p>
                                    </div>
                                    <div class="flex flex-col items-end gap-2 text-xs text-zinc-600">
                                        <span class="rounded bg-zinc-100 px-2 py-0.5 font-medium uppercase tracking-wide">
                                            {{ hook.label || hook.frameworkId }}
                                        </span>
                                        <div class="flex gap-2">
                                            <span class="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                                Curiosity {{ hook.curiosity }}
                                            </span>
                                            <span class="rounded bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                                                Alignment {{ hook.valueAlignment }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3 flex flex-wrap items-center gap-2">
                                    <PrimeButton
                                        size="small"
                                        label="Preview"
                                        outlined
                                        :severity="hook.id === previewId ? 'info' : undefined"
                                        @click="() => selectPreview(hook.id)"
                                    />
                                    <PrimeButton size="small" label="Use hook" @click="() => applyHook(hook.hook)" />
                                    <span
                                        v-if="hook.id === recommendedId"
                                        class="text-xs font-medium uppercase tracking-wide text-emerald-600"
                                    >
                                        Recommended
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </article>
            </div>
        </section>
    </Dialog>
</template>

<style scoped>
.hook-workbench-shell :deep(.p-dialog-content) {
    padding: 0;
}

.hook-workbench-drawer {
    max-height: 100vh;
}

.hook-workbench-content {
    padding: 0;
    border-radius: 0;
}

.hook-scroll-area {
    max-height: 17rem;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.hook-scroll-area::-webkit-scrollbar,
.hook-preview-text::-webkit-scrollbar {
    width: 6px;
}

.hook-scroll-area::-webkit-scrollbar-thumb,
.hook-preview-text::-webkit-scrollbar-thumb {
    background-color: rgba(113, 113, 122, 0.3);
    border-radius: 9999px;
}

.hook-preview-text {
    flex: 1;
    overflow-y: auto;
    white-space: pre-wrap;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #3f3f46;
}

:deep(.hook-count-input) {
    width: 100%;
}

@media (prefers-reduced-motion: reduce) {
    .hook-workbench-shell,
    .hook-workbench-shell :deep(.p-dialog),
    .hook-workbench-shell :deep(.p-dialog-mask),
    .hook-workbench-shell :deep(.p-component-overlay-enter-active),
    .hook-workbench-shell :deep(.p-component-overlay-leave-active) {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
    }
}
</style>
