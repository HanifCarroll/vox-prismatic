<script setup>
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const page = usePage();
const user = computed(() => page.props.auth?.user ?? null);
</script>

<template>
  <div class="min-h-screen bg-white text-zinc-900">
    <header class="border-b border-zinc-200/70">
      <nav class="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 md:py-8 lg:px-10">
        <Link href="/" class="flex items-center gap-2 text-lg font-semibold text-zinc-900 hover:text-zinc-600" aria-label="Vox Prismatic home">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">VP</span>
          <span>Vox Prismatic</span>
        </Link>
        <div class="flex items-center gap-6 text-sm font-medium text-zinc-600">
          <Link
            v-if="user"
            href="/projects"
            class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700"
          >
            Go to app
          </Link>
          <Link
            v-else
            href="/login"
            class="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>

    <main>
      <slot />
    </main>
  </div>
  
</template>

