<script setup>
import { computed } from 'vue';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const props = defineProps({
  current: { type: String, default: '' },
  password: { type: String, default: '' },
  confirmation: { type: String, default: '' },
  errors: { type: Object, default: () => ({}) },
  processing: { type: Boolean, default: false },
});

const emit = defineEmits(['update:current', 'update:password', 'update:confirmation', 'submit']);

const errorBag = computed(() => props.errors ?? {});
const currentError = computed(() => {
  const value = errorBag.value.current;
  return typeof value === 'string' && value.length > 0 ? value : null;
});
const passwordError = computed(() => {
  const value = errorBag.value.password;
  return typeof value === 'string' && value.length > 0 ? value : null;
});
const confirmationError = computed(() => {
  const value = errorBag.value.confirmation;
  return typeof value === 'string' && value.length > 0 ? value : null;
});

const handleInput = (field, event) => {
  emit(`update:${field}`, event.target.value);
};

const handleSubmit = (event) => {
  event.preventDefault();
  emit('submit');
};
</script>

<template>
  <Card>
    <form novalidate @submit="handleSubmit">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your password to keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <label for="settings-password-current" class="text-sm font-medium text-zinc-800">Current password</label>
          <input
            id="settings-password-current"
            :value="props.current"
            type="password"
            autocomplete="current-password"
            spellcheck="false"
            required
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="currentError ? 'settings-password-current-error' : 'settings-password-current-help'"
            :aria-invalid="currentError ? 'true' : 'false'"
            @input="(event) => handleInput('current', event)"
          />
          <p
            id="settings-password-current-help"
            class="text-xs text-zinc-500"
            :class="{ hidden: !!currentError }"
          >
            Enter the password you currently use to sign in.
          </p>
          <p
            v-if="currentError"
            id="settings-password-current-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ currentError }}
          </p>
        </div>

        <div class="space-y-2">
          <label for="settings-password-new" class="text-sm font-medium text-zinc-800">New password</label>
          <input
            id="settings-password-new"
            :value="props.password"
            type="password"
            autocomplete="new-password"
            spellcheck="false"
            required
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="passwordError ? 'settings-password-new-error' : 'settings-password-new-help'"
            :aria-invalid="passwordError ? 'true' : 'false'"
            @input="(event) => handleInput('password', event)"
          />
          <p
            id="settings-password-new-help"
            class="text-xs text-zinc-500"
            :class="{ hidden: !!passwordError }"
          >
            At least 12 characters, mixed case, with numbers and symbols.
          </p>
          <p
            v-if="passwordError"
            id="settings-password-new-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ passwordError }}
          </p>
        </div>

        <div class="space-y-2">
          <label for="settings-password-confirm" class="text-sm font-medium text-zinc-800">Confirm new password</label>
          <input
            id="settings-password-confirm"
            :value="props.confirmation"
            type="password"
            autocomplete="new-password"
            spellcheck="false"
            required
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="confirmationError ? 'settings-password-confirm-error' : undefined"
            :aria-invalid="confirmationError ? 'true' : 'false'"
            @input="(event) => handleInput('confirmation', event)"
          />
          <p
            v-if="confirmationError"
            id="settings-password-confirm-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ confirmationError }}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          class="inline-flex items-center"
          :disabled="props.processing"
        >
          <span
            v-if="props.processing"
            class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
          />
          Update password
        </Button>
      </CardFooter>
    </form>
  </Card>
</template>
