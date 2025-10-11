<script setup>
import ProjectPage from './ProjectPage.vue';

const props = defineProps({
  project: { type: Object, required: true },
  posts: { type: Array, default: () => [] },
  channels: {
    type: Object,
    default: () => ({ project: null, user: null }),
  },
  linkedIn: {
    type: Object,
    default: () => ({ connected: false }),
  },
  preferences: {
    type: Object,
    default: () => ({ timezone: 'UTC' }),
  },
  initialTab: { type: String, default: 'transcript' },
});
</script>

<template>
  <ProjectPage v-bind="props" />
</template>
