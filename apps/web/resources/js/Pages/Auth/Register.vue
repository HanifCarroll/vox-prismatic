<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3';
import { nextTick, ref, watch } from 'vue';

defineOptions({ layout: null });

const nameRef = ref(null);
const emailRef = ref(null);
const passwordRef = ref(null);
const attempted = ref(false);

const form = useForm({
    name: '',
    email: '',
    password: '',
});

const focusFirstError = (errors) => {
    if (!attempted.value) {
        return;
    }

    nextTick(() => {
        if (errors.name && nameRef.value) {
            nameRef.value.focus();
            nameRef.value.select?.();
            return;
        }

        if (errors.email && emailRef.value) {
            emailRef.value.focus();
            emailRef.value.select?.();
            return;
        }

        if (errors.password && passwordRef.value) {
            passwordRef.value.focus();
            passwordRef.value.select?.();
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
    form.post('/register', {
        onFinish: () => {
            form.reset('password');
        },
    });
};
</script>

<template>
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 via-zinc-50 to-white px-6 py-12">
        <Head title="Create account" />
        <div class="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 class="text-2xl font-semibold text-zinc-900">Create account</h1>
            <p class="mt-1 text-sm text-zinc-600">Join Content Creation to turn transcripts into LinkedIn-ready posts.</p>

            <form class="mt-8 space-y-6" @submit.prevent="submit" novalidate>
                <div class="space-y-2">
                    <label for="register-name" class="block text-sm font-medium text-zinc-800">Full name</label>
                    <input
                        id="register-name"
                        ref="nameRef"
                        v-model.trim="form.name"
                        type="text"
                        autocomplete="name"
                        required
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.name ? 'register-name-error' : undefined"
                        placeholder="Alex Morgan"
                    />
                    <p
                        v-if="form.errors.name"
                        id="register-name-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.name }}
                    </p>
                </div>

                <div class="space-y-2">
                    <label for="register-email" class="block text-sm font-medium text-zinc-800">Email</label>
                    <input
                        id="register-email"
                        ref="emailRef"
                        v-model.trim="form.email"
                        type="email"
                        inputmode="email"
                        autocomplete="email"
                        spellcheck="false"
                        required
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.email ? 'register-email-error' : 'register-email-help'"
                        placeholder="you@example.com"
                    />
                    <p
                        v-if="form.errors.email"
                        id="register-email-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.email }}
                    </p>
                </div>

                <div class="space-y-2">
                    <div class="flex items-center justify-between text-sm">
                        <label for="register-password" class="font-medium text-zinc-800">Password</label>
                        <span class="text-xs text-zinc-500">Use 8+ characters with mixed case, numbers, and symbols.</span>
                    </div>
                    <input
                        id="register-password"
                        ref="passwordRef"
                        v-model="form.password"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength="12"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.password ? 'register-password-error' : undefined"
                    />
                    <p
                        v-if="form.errors.password"
                        id="register-password-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.password }}
                    </p>
                </div>

                <PrimeButton
                    type="submit"
                    label="Create account"
                    :loading="form.processing"
                    class="w-full !bg-zinc-900 !border-none !px-4 !py-2 !text-sm !font-medium !text-white !rounded-md hover:!bg-zinc-800 focus-visible:!ring-2 focus-visible:!ring-offset-2 focus-visible:!ring-zinc-900"
                />

                <p class="text-center text-sm text-zinc-600">
                    Already have an account?
                    <Link href="/login" class="font-medium text-zinc-900 underline-offset-4 hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    </div>
</template>
