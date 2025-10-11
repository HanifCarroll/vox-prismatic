<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3';
import { computed, nextTick, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import MarketingLayout from '@/Layouts/MarketingLayout.vue';

defineOptions({ layout: MarketingLayout });

const props = defineProps({
  token: { type: String, required: true },
  email: { type: String, default: '' },
  status: { type: String, default: '' },
});

const emailRef = ref(null);
const passwordRef = ref(null);
const confirmRef = ref(null);
const attempted = ref(false);

const form = useForm({
  token: props.token,
  email: props.email,
  password: '',
  password_confirmation: '',
});

const statusMessage = computed(() => (props.status && props.status.length > 0 ? props.status : ''));

const focusFirstError = (errors) => {
  if (!attempted.value) {
    return;
  }

  nextTick(() => {
    if (errors.email && emailRef.value) {
      emailRef.value.focus();
      emailRef.value.select?.();
      return;
    }
    if (errors.password && passwordRef.value) {
      passwordRef.value.focus();
      passwordRef.value.select?.();
      return;
    }
    if (errors.password_confirmation && confirmRef.value) {
      confirmRef.value.focus();
      confirmRef.value.select?.();
    }
  });
};

watch(
  () => form.errors,
  (errors) => {
    focusFirstError(errors);
  },
  { deep: true },
);

const submit = () => {
  attempted.value = true;
  form.post('/reset-password', {
    preserveScroll: true,
    onFinish: () => {
      form.reset('password', 'password_confirmation');
    },
  });
};
</script>

<template>
  <div class="bg-gradient-to-br from-zinc-100 via-zinc-50 to-white px-6 py-20">
    <Head title="Set new password" />
    <div class="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-zinc-900">Choose a new password</h1>
      <p class="mt-1 text-sm text-zinc-600">Enter your email, set a strong password, and confirm to finish resetting.</p>

      <div
        v-if="statusMessage"
        class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        role="status"
        aria-live="polite"
      >
        {{ statusMessage }}
      </div>

      <form class="mt-6 space-y-6" @submit.prevent="submit" novalidate>
        <div class="space-y-2">
          <label for="reset-email" class="block text-sm font-medium text-zinc-800">Email</label>
          <input
            id="reset-email"
            ref="emailRef"
            v-model.trim="form.email"
            type="email"
            inputmode="email"
            autocomplete="email"
            spellcheck="false"
            required
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="form.errors.email ? 'reset-email-error' : undefined"
            placeholder="you@example.com"
          />
          <p
            v-if="form.errors.email"
            id="reset-email-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ form.errors.email }}
          </p>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <label for="reset-password" class="font-medium text-zinc-800">New password</label>
            <span class="text-xs text-zinc-500">Minimum 12 characters.</span>
          </div>
          <input
            id="reset-password"
            ref="passwordRef"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            spellcheck="false"
            required
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="form.errors.password ? 'reset-password-error' : 'reset-password-help'"
          />
          <p
            id="reset-password-help"
            class="text-xs text-zinc-500"
            :class="{ hidden: !!form.errors.password }"
          >
            Mix upper and lowercase letters, numbers, and symbols.
          </p>
          <p
            v-if="form.errors.password"
            id="reset-password-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ form.errors.password }}
          </p>
        </div>

        <div class="space-y-2">
          <label for="reset-password-confirm" class="text-sm font-medium text-zinc-800">Confirm new password</label>
          <input
            id="reset-password-confirm"
            ref="confirmRef"
            v-model="form.password_confirmation"
            type="password"
            autocomplete="new-password"
            spellcheck="false"
            required
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="form.errors.password_confirmation ? 'reset-password-confirm-error' : undefined"
          />
          <p
            v-if="form.errors.password_confirmation"
            id="reset-password-confirm-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ form.errors.password_confirmation }}
          </p>
        </div>
        <Button
          type="submit"
          class="w-full inline-flex items-center justify-center"
          :disabled="form.processing"
        >
          <span v-if="form.processing" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
          Reset password
        </Button>

        <div class="text-center text-sm">
          <span class="text-zinc-600">Remembered it?</span>
          <Link href="/login" class="ml-1 font-medium text-zinc-900 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  </div>
</template>
