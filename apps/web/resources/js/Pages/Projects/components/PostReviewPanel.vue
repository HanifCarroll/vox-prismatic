<script setup>
import { computed } from 'vue';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';

const props = defineProps({
  review: { type: Object, default: null },
});

const clampScore = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const scoreItems = computed(() => {
  const scores = props.review?.scores ?? null;
  if (!scores || typeof scores !== 'object') return [];
  const entries = [
    { key: 'clarity', label: 'Clarity', value: clampScore(scores.clarity ?? scores['clarity']) },
    { key: 'engagement', label: 'Engagement', value: clampScore(scores.engagementPotential ?? scores.engagement_potential ?? scores['engagement']) },
    { key: 'readability', label: 'Readability', value: clampScore(scores.readability ?? scores['readability']) },
  ];
  return entries.filter((entry) => entry.value !== null);
});

const suggestions = computed(() => {
  const list = props.review?.suggestions;
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    type: (item?.type ?? '').toString(),
    originalText: (item?.originalText ?? item?.original_text ?? '').toString(),
    suggestion: (item?.suggestion ?? item?.suggested_improvement ?? '').toString(),
    rationale: item?.rationale ? item.rationale.toString() : null,
  })).filter((item) => item.originalText.trim() !== '' && item.suggestion.trim() !== '');
});

const hasSuggestions = computed(() => suggestions.value.length > 0);

const reviewedRelative = computed(() => {
  const value = props.review?.reviewedAt;
  if (!value) return null;
  return formatRelativeTime(value);
});

const reviewedExact = computed(() => {
  const value = props.review?.reviewedAt;
  if (!value) return null;
  return formatDateTime(value);
});

const reviewStateMessage = computed(() => {
  if (!props.review) {
    return 'Select a generated post to see AI suggestions.';
  }
  return null;
});
</script>

<template>
  <div class="rounded-md border border-zinc-200 bg-white px-4 py-4 shadow-sm" aria-live="polite">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-sm font-semibold text-zinc-900">AI Review</h2>
      <p v-if="reviewedRelative" class="text-xs text-zinc-500" :title="reviewedExact ?? undefined">
        Reviewed {{ reviewedRelative }}
      </p>
    </div>

    <p v-if="reviewStateMessage" class="mt-3 text-sm text-zinc-600">{{ reviewStateMessage }}</p>

    <template v-else>
      <div v-if="scoreItems.length" class="mt-3 flex flex-wrap gap-3">
        <div
          v-for="item in scoreItems"
          :key="item.key"
          class="min-w-[120px] flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">{{ item.label }}</p>
          <p class="mt-1 text-lg font-semibold text-zinc-900"><span class="tabular-nums">{{ item.value }}</span>/100</p>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-zinc-600">Scores unavailable for this draft.</p>

      <div class="mt-4">
        <h3 class="text-sm font-semibold text-zinc-900">Suggestions</h3>
        <ol v-if="hasSuggestions" class="mt-2 space-y-3">
          <li v-for="(suggestion, index) in suggestions" :key="index" class="rounded-md border border-zinc-200 bg-white px-3 py-3 shadow-sm">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-emerald-600">{{ suggestion.type || 'impact' }}</span>
            </div>
            <div class="mt-2 space-y-2">
              <div>
                <p class="text-xs font-medium text-zinc-500">Original</p>
                <p class="whitespace-pre-line text-sm text-zinc-800">{{ suggestion.originalText }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-emerald-600">Recommended</p>
                <p class="whitespace-pre-line text-sm text-zinc-900">{{ suggestion.suggestion }}</p>
              </div>
              <p v-if="suggestion.rationale" class="text-xs text-zinc-600">
                Why: {{ suggestion.rationale }}
              </p>
            </div>
          </li>
        </ol>
        <p v-else class="mt-2 text-sm text-zinc-600">No major edits suggested. This draft is in strong shape.</p>
      </div>
    </template>
  </div>
</template>
