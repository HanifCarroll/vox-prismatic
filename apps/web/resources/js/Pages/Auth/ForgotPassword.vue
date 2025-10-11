<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3';
import { computed, nextTick, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import MarketingLayout from '@/Layouts/MarketingLayout.vue';

defineOptions({ layout: MarketingLayout });

const props = defineProps({
  status: { type: String, default: '' },
});

const emailRef = ref(null);
const attempted = ref(false);

const form = useForm({
  email: '',
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
  form.post('/forgot-password', {
    preserveScroll: true,
    onSuccess: () => {
      form.reset();
      attempted.value = false;
      nextTick(() => {
        emailRef.value?.focus();
      });
    },
  });
};
</script>

<template>
  <div class="bg-gradient-to-br from-zinc-100 via-zinc-50 to-white px-6 py-20">
    <Head title="Forgot password" />
    <div class="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-zinc-900">Reset your password</h1>
      <p class="mt-1 text-sm text-zinc-600">Enter your email and we’ll send a link to reset your password.</p>

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
          <label for="forgot-email" class="block text-sm font-medium text-zinc-800">Email</label>
          <input
            id="forgot-email"
            ref="emailRef"
            v-model.trim="form.email"
            type="email"
            inputmode="email"
            autocomplete="email"
            spellcheck="false"
            required
            autofocus
            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            :aria-describedby="form.errors.email ? 'forgot-email-error' : 'forgot-email-help'"
            placeholder="you@example.com"
          />
          <p
            id="forgot-email-help"
            class="text-xs text-zinc-500"
            :class="{ hidden: !!form.errors.email }"
          >
            We’ll send reset instructions to this email.
          </p>
          <p
            v-if="form.errors.email"
            id="forgot-email-error"
            class="text-sm text-red-600"
            role="alert"
          >
            {{ form.errors.email }}
          </p>
        </div>

        <Button
          type="submit"
          class="w-full inline-flex items-center justify-center"
          :disabled="form.processing"
        >
          <span v-if="form.processing" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
          Send reset link
        </Button>

        <div class="text-center text-sm">
          <span class="text-zinc-600">Remembered your password?</span>
          <Link href="/login" class="ml-1 font-medium text-zinc-900 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  </div>
</template>
