<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3';
import { nextTick, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import MarketingLayout from '@/Layouts/MarketingLayout.vue';

defineOptions({ layout: MarketingLayout });

const props = defineProps({
    canRegister: { type: Boolean, default: true },
    isInviteOnly: { type: Boolean, default: false },
    contactEmail: { type: String, default: '' },
});

const emailRef = ref(null);
const passwordRef = ref(null);
const attempted = ref(false);

const form = useForm({
    email: '',
    password: '',
    remember: true,
});

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
    form.post('/login', {
        onFinish: () => {
            form.reset('password');
        },
    });
};
</script>

<template>
    <div class="bg-gradient-to-br from-zinc-100 via-zinc-50 to-white px-6 py-20">
        <Head title="Sign in" />
        <div class="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 class="text-2xl font-semibold text-zinc-900">Sign in</h1>
            <p class="mt-1 text-sm text-zinc-600">Welcome back. Sign in to continue creating LinkedIn posts.</p>

            <form class="mt-8 space-y-6" @submit.prevent="submit" novalidate>
                <div class="space-y-2">
                    <label for="login-email" class="block text-sm font-medium text-zinc-800">Email</label>
                    <input
                        id="login-email"
                        ref="emailRef"
                        v-model.trim="form.email"
                        type="email"
                        inputmode="email"
                        autocomplete="email"
                        spellcheck="false"
                        required
                        autofocus
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.email ? 'login-email-error' : 'login-email-help'"
                        placeholder="you@example.com"
                    />
                    <p
                        id="login-email-help"
                        class="text-xs text-zinc-500"
                        :class="{ hidden: !!form.errors.email }"
                    >
                        Use the email you registered with.
                    </p>
                    <p
                        v-if="form.errors.email"
                        id="login-email-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.email }}
                    </p>
                </div>

                <div class="space-y-2">
                    <div class="flex items-center justify-between text-sm">
                        <label for="login-password" class="font-medium text-zinc-800">Password</label>
                        <span class="text-xs text-zinc-500">Minimum 8 characters.</span>
                    </div>
                    <input
                        id="login-password"
                        ref="passwordRef"
                        v-model="form.password"
                        type="password"
                        autocomplete="current-password"
                        required
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.password ? 'login-password-error' : undefined"
                    />
                    <p
                        v-if="form.errors.password"
                        id="login-password-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.password }}
                    </p>
                </div>

                <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                            v-model="form.remember"
                            type="checkbox"
                            class="h-4 w-4 rounded border-zinc-300"
                        />
                        <span>Keep me signed in</span>
                    </label>
                    <Link
                        v-if="props.canRegister"
                        href="/register"
                        class="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
                    >
                        Create account
                    </Link>
                    <span v-else class="text-xs text-zinc-500">
                        Invite-only. Email
                        <a :href="`mailto:${props.contactEmail}`" class="font-medium text-zinc-900 underline-offset-4 hover:underline">
                            {{ props.contactEmail }}
                        </a>
                        for access.
                    </span>
                </div>

                <Button
                    type="submit"
                    class="w-full inline-flex items-center justify-center"
                    :disabled="form.processing"
                >
                    <span v-if="form.processing" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                    Sign in
                </Button>
            </form>
        </div>
    </div>
</template>
