<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const props = defineProps({
  posts: { type: Array, default: () => [] },
  selection: { type: Array, default: () => [] },
  selectedPostId: { type: String, default: null },
});

const emit = defineEmits(['update:selection', 'select']);

const sidebarRowClass = ({ data }) => (
  data?.id === props.selectedPostId
    ? '!bg-indigo-50 !text-zinc-900 ring-1 ring-inset ring-indigo-200'
    : ''
);
const sidebarRowStyle = ({ data }) => (
  data?.id === props.selectedPostId ? { backgroundColor: '#eef2ff' } : undefined
);
</script>

<template>
  <div class="rounded-md border border-zinc-200 bg-white">
    <DataTable
      :value="props.posts"
      dataKey="id"
      scrollable
      scrollHeight="60vh"
      :selection="props.selection"
      @update:selection="(rows) => emit('update:selection', rows)"
      :rowClass="sidebarRowClass"
      :rowStyle="sidebarRowStyle"
      @rowClick="(e) => { const id = e.data?.id; if (id) emit('select', id); }"
    >
      <Column selectionMode="multiple" headerStyle="width:3rem"></Column>
      <Column field="status" header="Status" style="width: 8rem">
        <template #body="{ data }">
          <span class="sr-only">Status:</span>
          <Tag
            :value="data.scheduleStatus === 'scheduled' ? 'scheduled' : (data.status || 'pending')"
            :severity="
              data.scheduleStatus==='scheduled' ? 'info' :
              data.status==='approved' ? 'success' :
              data.status==='rejected' ? 'danger' :
              data.status==='published' ? 'info' : 'secondary'"
          />
        </template>
      </Column>
      <Column field="content" header="Post" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="line-clamp-2 text-sm">{{ (data.content || '').slice(0, 160) || '—' }}</div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

