<script setup>
import { Button } from '@/components/ui/button';

const props = defineProps({
  usage: { type: Array, default: () => [] },
  currentUserId: { type: [String, Number, null], default: null },
  formatCurrency: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
  formatDateTime: { type: Function, required: true },
  formatRelativeTime: { type: Function, required: true },
  resolveSubscriptionBadge: { type: Function, required: true },
  isTrialActive: { type: Function, required: true },
});
const emit = defineEmits(['manageTrial', 'deleteUser']);
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-zinc-200 text-left text-sm">
      <thead class="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <tr>
          <th scope="col" class="px-4 py-3">User</th>
          <th scope="col" class="px-4 py-3">Usage</th>
          <th scope="col" class="px-4 py-3">Last active</th>
          <th scope="col" class="px-4 py-3">Subscription</th>
          <th scope="col" class="px-4 py-3">Trial</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in props.usage" :key="entry.userId" class="divide-y divide-transparent border-b border-zinc-200 hover:bg-zinc-50">
          <td class="whitespace-nowrap px-4 py-3 align-top">
            <div class="font-medium text-zinc-900">{{ entry.name || entry.email || 'Unknown user' }}</div>
            <div class="text-xs text-zinc-500" :title="entry.email">{{ entry.email || '—' }}</div>
          </td>
          <td class="px-4 py-3 align-top">
            <div class="font-medium text-zinc-900">{{ props.formatCurrency(entry.totalCostUsd) }}</div>
            <div class="text-xs text-zinc-500">{{ props.formatNumber(entry.totalActions) }} actions</div>
          </td>
          <td class="px-4 py-3 align-top">
            <div class="text-sm text-zinc-800">
              <span v-if="entry.lastActionAt">{{ props.formatRelativeTime(entry.lastActionAt) }}</span>
              <span v-else>No usage yet</span>
            </div>
            <div v-if="entry.lastActionAt" class="text-xs text-zinc-500">{{ props.formatDateTime(entry.lastActionAt) }}</div>
          </td>
          <td class="px-4 py-3 align-top">
            <div class="inline-flex items-center gap-2">
              <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="props.resolveSubscriptionBadge(entry.subscriptionStatus).classes">
                {{ props.resolveSubscriptionBadge(entry.subscriptionStatus).label }}
              </span>
              <span v-if="entry.subscriptionPlan" class="text-xs text-zinc-500">{{ entry.subscriptionPlan }}</span>
            </div>
            <div v-if="entry.subscriptionCurrentPeriodEnd" class="text-xs text-zinc-500">
              Renews {{ props.formatDateTime(entry.subscriptionCurrentPeriodEnd) }}
              <span class="ml-1">({{ props.formatRelativeTime(entry.subscriptionCurrentPeriodEnd) }})</span>
            </div>
            <div v-if="entry.cancelAtPeriodEnd" class="text-xs font-medium text-amber-600">Cancels at period end</div>
            <div v-if="entry.stripeCustomerId" class="text-xs text-zinc-500">Customer: {{ entry.stripeCustomerId }}</div>
          </td>
          <td class="px-4 py-3 align-top">
            <div v-if="entry.trialEndsAt" class="text-sm" :class="props.isTrialActive(entry.trialEndsAt) ? 'text-emerald-700' : 'text-zinc-600'">
              <template v-if="props.isTrialActive(entry.trialEndsAt)">
                Active until {{ props.formatDateTime(entry.trialEndsAt) }}
                <span class="ml-1 text-xs text-emerald-600">({{ props.formatRelativeTime(entry.trialEndsAt) }})</span>
              </template>
              <template v-else>
                Ended {{ props.formatRelativeTime(entry.trialEndsAt) }}
                <span class="ml-1 text-xs text-zinc-500">({{ props.formatDateTime(entry.trialEndsAt) }})</span>
              </template>
            </div>
            <div v-else class="text-sm text-zinc-600">No trial</div>
            <p v-if="entry.trialNotes" class="mt-1 max-w-xs text-xs text-zinc-500" :title="entry.trialNotes">{{ entry.trialNotes }}</p>
          </td>
          <td class="px-4 py-3 text-right align-top">
            <div class="flex flex-col items-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="inline-flex items-center gap-1"
                @click="() => emit('manageTrial', entry)"
              >
                Manage trial
                <span class="sr-only">for {{ entry.name || entry.email || entry.userId }}</span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                :disabled="entry.userId === props.currentUserId"
                class="inline-flex items-center gap-1"
                @click="() => emit('deleteUser', entry)"
              >
                Delete account
                <span class="sr-only">for {{ entry.name || entry.email || entry.userId }}</span>
              </Button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
