<script setup>
// Simple Card wrapper with slot API similar to PrimeVue Card
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white shadow-sm">
    <div class="p-4 border-b border-zinc-200">
      <h3 class="text-base font-semibold text-zinc-900">
        <slot name="title" />
      </h3>
      <div class="mt-1 text-sm text-zinc-600">
        <slot name="subtitle" />
      </div>
    </div>
    <div class="p-4">
      <slot name="content" />
    </div>
  </div>
</template>

