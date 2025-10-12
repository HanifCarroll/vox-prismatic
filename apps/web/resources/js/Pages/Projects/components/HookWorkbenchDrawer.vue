<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/utils/notifications';
// Motion animations are handled in SheetContent
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

const { push: pushNotification } = useNotifications();

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

const pickDefaultFrameworks = (list) => {
    if (!Array.isArray(list) || list.length === 0) {
        return [];
    }
    const shuffled = list.slice().sort(() => Math.random() - 0.5);
    const take = Math.min(3, shuffled.length);
    return shuffled.slice(0, take).map((fw) => fw.id);
};

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
                selectedFrameworkIds.value = pickDefaultFrameworks(frameworks.value);
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
        pushNotification('success', 'Hooks generated. Review the variants and pick a winner.');
    } catch (error) {
        const message = parseErrorMessage(error);
        requestError.value = message;
        pushNotification('error', message || 'Failed to generate hooks');
    } finally {
        generating.value = false;
    }
};

const applyHook = (hook) => {
    if (!hook) {
        return;
    }
    props.onApplyHook?.(hook);
    pushNotification('success', 'Hook applied. Opening line updated in the draft.');
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

const openModel = computed({
  get: () => props.open,
  set: (v) => handleVisibilityChange(v),
});

onMounted(() => {
    if (props.open) {
        fetchFrameworks();
    }
});
</script>

<template>
    <Sheet v-model:open="openModel">
      <!-- Ensure opaque background and proper width overriding Sheet defaults -->
      <SheetContent
        side="right"
        :noAnimations="true"
        class="hook-workbench-shell bg-white p-0 overflow-y-auto"
        :style="{ width: 'min(1100px, 100vw)', maxWidth: 'none' }"
      >
        <section
          class="flex h-full max-h-full min-h-0 flex-col gap-6 p-6"
          aria-label="Hook workbench panel"
        >
            <header class="flex flex-col gap-2">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-lg font-semibold text-zinc-900">Hook workbench</h2>
                        <p class="text-sm text-zinc-600">
                            Generate opening lines, preview them with your draft, and drop the winner into the editor.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="inline-flex h-9 items-center px-3 text-sm font-medium text-zinc-600"
                        @click="closeDrawer"
                        aria-label="Close hook workbench"
                    >
                        Close
                    </Button>
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

            <div v-else class="grid flex-1 min-h-0 gap-6 lg:grid-cols-[360px_1fr]">
                <aside class="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
                    <div class="flex min-h-0 flex-col space-y-3 overflow-hidden rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                        <div class="flex items-center justify-between gap-2 text-xs text-zinc-500">
                            <span>{{ selectedFrameworkIds.length }} selected</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                class="text-xs font-medium text-zinc-600"
                                :disabled="frameworks.length === 0"
                                @click="() => { selectedFrameworkIds = frameworks.slice(0, Math.min(3, frameworks.length)).map((fw) => fw.id); }"
                            >
                                Reset
                            </Button>
                        </div>
                        <div class="hook-scroll-area flex-1 min-h-0">
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
                        <input
                            id="hook-count"
                            v-model.number="count"
                            type="number"
                            min="3"
                            max="5"
                            step="1"
                            class="hook-count-input w-full rounded-md border border-zinc-300 px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            aria-describedby="hook-count-help"
                        />
                        <p id="hook-count-help" class="text-xs text-zinc-500">Generate between 3 and 5 hooks per run.</p>
                    </div>

                    <div class="space-y-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                        <label class="block text-sm font-medium text-zinc-800" for="hook-focus">Custom focus (optional)</label>
                        <textarea
                            id="hook-focus"
                            v-model="customFocus"
                            rows="3"
                            :maxlength="customFocusLimit"
                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            placeholder="Highlight a specific audience, objection, or proof point…"
                        />
                        <div class="flex items-center justify-between text-xs text-zinc-500">
                            <span>{{ Math.max(customFocusRemaining, 0) }} characters left</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                class="text-xs font-medium text-zinc-600"
                                :disabled="customFocus.length === 0"
                                @click="() => { customFocus = ''; }"
                            >
                                Clear
                            </Button>
                        </div>
                    </div>

                    <div class="mt-auto space-y-2">
                        <Button :disabled="generateDisabled || generating" class="w-full" @click="generateHooks" data-autofocus>
                          <span v-if="generating" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                          Generate hooks
                        </Button>
                        <p class="text-xs text-zinc-500">The draft remains unchanged until you choose “Use hook”.</p>
                    </div>
                </aside>

                <article class="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
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
                                    <Button size="sm" variant="outline" @click="() => selectPreview(hook.id)">Preview</Button>
                                    <Button size="sm" @click="() => applyHook(hook.hook)">Use hook</Button>
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
      </SheetContent>
    </Sheet>
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
    /* Scrollable list fills available space inside its card */
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
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
