<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3';
import { computed, nextTick, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';

defineOptions({ layout: null });

const props = defineProps({
    mode: { type: String, default: 'invite' },
    contactEmail: { type: String, default: '' },
    code: { type: String, default: '' },
});

const nameRef = ref(null);
const emailRef = ref(null);
const codeRef = ref(null);
const passwordRef = ref(null);
const attempted = ref(false);

const isInviteOnly = computed(() => props.mode === 'invite');

const form = useForm({
    name: '',
    email: '',
    password: '',
    code: props.code ?? '',
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

        if (errors.code && codeRef.value) {
            codeRef.value.focus();
            codeRef.value.select?.();
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
            <p class="mt-1 text-sm text-zinc-600">Join Vox Prismatic to turn transcripts into LinkedIn-ready posts.</p>

            <div
                v-if="isInviteOnly"
                class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
                role="status"
            >
                <p class="font-medium">Invite-only access</p>
                <p class="mt-1">
                    We&rsquo;re onboarding new customers gradually. Use your invite code to continue.
                    If you need access, email
                    <a :href="`mailto:${props.contactEmail}`" class="font-medium text-amber-900 underline-offset-4 hover:underline">
                        {{ props.contactEmail }}
                    </a>.
                </p>
            </div>

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

                <div class="space-y-2" v-if="isInviteOnly">
                    <label for="register-code" class="block text-sm font-medium text-zinc-800">Invite code</label>
                    <input
                        id="register-code"
                        ref="codeRef"
                        v-model.trim="form.code"
                        type="text"
                        inputmode="text"
                        autocomplete="off"
                        spellcheck="false"
                        :required="isInviteOnly"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.code ? 'register-code-error' : 'register-code-help'"
                        placeholder="00000000-0000-0000-0000-000000000000"
                    />
                    <p
                        id="register-code-help"
                        class="text-xs text-zinc-500"
                        :class="{ hidden: !!form.errors.code }"
                    >
                        Paste the invite code from your email or team admin.
                    </p>
                    <p
                        v-if="form.errors.code"
                        id="register-code-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.code }}
                    </p>
                </div>

                <div class="space-y-2">
                    <label for="register-password" class="block text-sm font-medium text-zinc-800">Password</label>
                    <input
                        id="register-password"
                        ref="passwordRef"
                        v-model="form.password"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength="8"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        :aria-describedby="form.errors.password ? 'register-password-error' : 'register-password-help'"
                    />
                    <p
                        id="register-password-help"
                        class="text-xs text-zinc-500"
                        :class="{ hidden: !!form.errors.password }"
                    >
                        Use 8+ characters with mixed case, numbers, and symbols.
                    </p>
                    <p
                        v-if="form.errors.password"
                        id="register-password-error"
                        class="text-sm text-red-600"
                        role="alert"
                    >
                        {{ form.errors.password }}
                    </p>
                </div>

                <Button
                    type="submit"
                    class="w-full inline-flex items-center justify-center"
                    :disabled="form.processing"
                >
                    <span v-if="form.processing" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                    Create account
                </Button>

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
