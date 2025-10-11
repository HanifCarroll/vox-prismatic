<script setup>
import { Checkbox } from '@/components/ui/checkbox';
import { computed } from 'vue';

const props = defineProps({
  posts: { type: Array, default: () => [] },
  selection: { type: Array, default: () => [] },
  selectedPostId: { type: String, default: null },
  regeneratingIds: { type: Array, default: () => [] },
  allSelected: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
});

const emit = defineEmits(['update:selection', 'select', 'update:allSelected']);

const isSelected = (post) => props.selection.some((row) => row.id === post.id);
const isRegenerating = (post) => props.regeneratingIds.includes(post.id);
const toggleSelect = (post, val) => {
  const next = val
    ? [...props.selection.filter((r) => r.id !== post.id), post]
    : props.selection.filter((r) => r.id !== post.id);
  emit('update:selection', next);
};

const statusBadge = (data) => {
  if (isRegenerating(data)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  const status = data.scheduleStatus === 'scheduled' ? 'scheduled' : (data.status || 'pending');
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'published':
    case 'scheduled':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';
  }
};

const statusLabel = (data) => {
  if (isRegenerating(data)) {
    return 'Regenerating…';
  }
  return data.scheduleStatus === 'scheduled' ? 'scheduled' : (data.status || 'pending');
};

const headerCheckboxAria = computed(() => {
  if (props.allSelected) {
    return 'Deselect all posts';
  }
  if (props.indeterminate) {
    return 'Select all posts (currently partially selected)';
  }
  return 'Select all posts';
});
</script>

<template>
  <div class="rounded-md border border-zinc-200 bg-white">
    <div class="max-h-[60vh] overflow-y-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th class="w-10 px-3 py-2">
              <Checkbox
                :modelValue="props.allSelected"
                :indeterminate="props.indeterminate"
                :aria-label="headerCheckboxAria"
                @update:modelValue="(value) => emit('update:allSelected', value)"
              />
            </th>
            <th class="w-28 px-3 py-2">Status</th>
            <th class="px-3 py-2">Post</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="post in props.posts"
            :key="post.id"
            class="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
            :class="post.id===props.selectedPostId ? 'bg-indigo-50' : ''"
            @click="() => emit('select', post.id)"
          >
            <td class="px-3 py-2 align-top" @click.stop>
              <Checkbox :modelValue="isSelected(post)" @update:modelValue="(v) => toggleSelect(post, v)" aria-label="Select" />
            </td>
            <td class="px-3 py-2 align-top">
              <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium" :class="statusBadge(post)">
                <span
                  v-if="isRegenerating(post)"
                  class="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400/60 border-t-transparent"
                  aria-hidden="true"
                />
                {{ statusLabel(post) }}
              </span>
            </td>
            <td class="px-3 py-2 align-top">
              <div class="line-clamp-2">{{ (post.content || '').slice(0, 160) || '—' }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
