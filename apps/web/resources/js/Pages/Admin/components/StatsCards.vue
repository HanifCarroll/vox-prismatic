<script setup>
const props = defineProps({
  totals: { type: Object, required: true },
  formatCurrency: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
});
</script>

<template>
  <section class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-medium text-zinc-500">Total spend</div>
      <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ props.formatCurrency(props.totals.totalSpend) }}</div>
    </article>
    <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-medium text-zinc-500">Total AI actions</div>
      <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ props.formatNumber(props.totals.totalActions) }}</div>
    </article>
    <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-medium text-zinc-500">Active subscriptions</div>
      <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ props.formatNumber(props.totals.activeSubscriptions) }}</div>
    </article>
    <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-medium text-zinc-500">Active trials</div>
      <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ props.formatNumber(props.totals.activeTrials) }}</div>
    </article>
  </section>
</template>

