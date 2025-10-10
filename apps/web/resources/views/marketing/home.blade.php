@extends('marketing.layout')

@section('title', 'Automate LinkedIn content that sounds like you')
@section('meta_description', 'Vox Prismatic turns transcripts and notes into LinkedIn posts that keep your voice. Join the closed beta waitlist to get early access.')

@section('content')
    <section class="relative overflow-hidden">
        <div class="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-50 via-white to-zinc-100"></div>
        <div class="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.12),_transparent)]"></div>
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 py-32 md:py-36 lg:flex-row lg:items-center lg:gap-28 lg:py-44 lg:px-10">
            <div class="w-full lg:max-w-xl">
                <span class="inline-flex items-center rounded-full bg-zinc-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700">Closed beta now onboarding</span>
                <h1 class="mt-8 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                    Ship authentic LinkedIn posts on autopilot
                </h1>
                <p class="mt-7 text-lg leading-8 text-zinc-600">
                    Vox Prismatic helps founders, operators, consultants, and creators publish consistent, high-performing updates in their own voice. Drop in transcripts, notes, or outlines and we do the heavy lifting from insight to scheduled post.
                </p>
                <ul class="mt-10 grid gap-6 text-sm text-zinc-600 sm:grid-cols-2">
                    <li class="flex items-start gap-3 rounded-2xl bg-white/80 p-5 shadow-md ring-1 ring-zinc-200/70 backdrop-blur">
                        <span class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                        <span><strong class="text-zinc-900">Ingest anything</strong><br>Upload transcripts, drop links, or paste raw ideas—no formatting required.</span>
                    </li>
                    <li class="flex items-start gap-3 rounded-2xl bg-white/80 p-5 shadow-md ring-1 ring-zinc-200/70 backdrop-blur">
                        <span class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                        <span><strong class="text-zinc-900">Drafts in your voice</strong><br>AI tuned to your tone creates posts that feel personal, not generic.</span>
                    </li>
                    <li class="flex items-start gap-3 rounded-2xl bg-white/80 p-5 shadow-md ring-1 ring-zinc-200/70 backdrop-blur">
                        <span class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                        <span><strong class="text-zinc-900">Pipeline clarity</strong><br>See processing, drafts, approvals, and schedule status in a single workspace.</span>
                    </li>
                    <li class="flex items-start gap-3 rounded-2xl bg-white/80 p-5 shadow-md ring-1 ring-zinc-200/70 backdrop-blur">
                        <span class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">4</span>
                        <span><strong class="text-zinc-900">Publish confidently</strong><br>Bulk approvals, guardrails for LinkedIn, and optional scheduling automation.</span>
                    </li>
                </ul>
                <div class="mt-14 rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-lg backdrop-blur" id="waitlist-top">
                    <h2 class="text-base font-semibold text-zinc-900">Join the waitlist</h2>
                    <p class="mt-2 text-sm text-zinc-600">We’re inviting new cohorts every few weeks. Leave your email and we’ll follow up when a spot opens.</p>
                    @if ($waitlistSuccess)
                        <div class="mt-4 rounded-md bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                            {{ $waitlistSuccess }}
                        </div>
                    @else
                        <form method="POST" action="{{ route('marketing.waitlist') }}" class="mt-5 flex flex-col gap-3 sm:flex-row">
                            @csrf
                            <div class="flex-1">
                                <label for="waitlist-email-top" class="sr-only">Email</label>
                                <input
                                    id="waitlist-email-top"
                                    name="email"
                                    type="email"
                                    inputmode="email"
                                    autocomplete="email"
                                    required
                                    placeholder="you@example.com"
                                    class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/30"
                                    value="{{ old('email') }}"
                                >
                                @error('email')
                                    <p class="mt-2 text-sm text-rose-600">{{ $message }}</p>
                                @enderror
                            </div>
                            <button type="submit" class="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
                                Get notified
                            </button>
                        </form>
                    @endif
                    <p class="mt-3 text-xs text-zinc-500">No spam. Just release updates and a fast path into the beta.</p>
                </div>
            </div>
            <div class="w-full lg:flex-1 lg:min-w-[28rem] xl:min-w-[30rem] lg:pl-12 xl:pl-16">
                <div class="relative isolate overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white/90 p-8 shadow-2xl backdrop-blur">
                    <div class="absolute -right-10 top-12 h-64 w-64 rounded-full bg-zinc-900/5 blur-3xl"></div>
                    <div class="relative flex flex-col gap-6">
                        <div class="flex items-center gap-3">
                            <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-semibold text-white">AI</span>
                            <div>
                                <p class="text-sm font-semibold uppercase tracking-wide text-zinc-600">Workflow snapshot</p>
                                <p class="text-lg font-semibold text-zinc-900">Project: Weekly recap</p>
                            </div>
                        </div>
                        <div class="space-y-4 text-sm text-zinc-600">
                            <div class="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4">
                                <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    <span>Processing</span>
                                    <span>Step 2 of 4</span>
                                </div>
                                <p class="mt-2 text-base font-semibold text-zinc-900">Extracting insights…</p>
                                <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                                    <div class="h-full w-2/3 rounded-full bg-zinc-900"></div>
                                </div>
                            </div>
                            <div class="rounded-2xl border border-zinc-200 bg-white/90 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next up</p>
                                <ul class="mt-2 space-y-3">
                                    <li class="flex items-start gap-2">
                                        <span class="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-900"></span>
                                        <span><strong class="text-zinc-900">7 post drafts</strong> ready for edit and approval.</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        <span class="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-900"></span>
                                        <span><strong class="text-zinc-900">Schedule suggestions</strong> tuned to your best performing windows.</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        <span class="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-900"></span>
                                        <span><strong class="text-zinc-900">Polish queue</strong> for quick review and final tweaks.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <p class="text-xs text-zinc-500">This is an illustrative preview of how Vox Prismatic guides each project from raw material to scheduled posts.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="border-t border-zinc-200/70 bg-white">
        <div class="mx-auto w-full max-w-7xl px-6 pb-36 pt-40 lg:px-10">
            <div class="flex flex-col gap-16 lg:flex-row">
                <div class="max-w-xl flex-1 lg:sticky lg:top-24">
                    <h2 class="text-4xl font-semibold text-zinc-900">Why creators choose Vox Prismatic</h2>
                    <p class="mt-6 text-sm leading-6 text-zinc-600">AI-powered drafting with a project-centric workflow so every update stays true to your voice.</p>
                </div>
                <div class="flex-1">
                    <dl class="grid gap-8 sm:grid-cols-2">
                        <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-10 shadow-sm">
                            <dt class="text-lg font-semibold text-zinc-900">Keep your voice consistent</dt>
                            <dd class="mt-3 text-base leading-7 text-zinc-600">Every project starts with your transcript or outline. We model tone, pacing, and vocabulary so posts feel unmistakably yours.</dd>
                        </div>
                        <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-10 shadow-sm">
                            <dt class="text-lg font-semibold text-zinc-900">Know what’s next at every stage</dt>
                            <dd class="mt-3 text-base leading-7 text-zinc-600">Processing → posts → ready-to-publish. The pipeline view keeps approvals, bulk actions, and scheduling transparent.</dd>
                        </div>
                        <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-10 shadow-sm">
                            <dt class="text-lg font-semibold text-zinc-900">Publish confidently</dt>
                            <dd class="mt-3 text-base leading-7 text-zinc-600">We respect LinkedIn limits, handle formatting, and provide optional autopublish so you never miss your window.</dd>
                        </div>
                        <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-10 shadow-sm">
                            <dt class="text-lg font-semibold text-zinc-900">Keep a steady cadence</dt>
                            <dd class="mt-3 text-base leading-7 text-zinc-600">Batch drafts and smart schedule suggestions help you show up consistently without daily effort.</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    </section>

    <section class="relative overflow-hidden bg-zinc-900" id="waitlist-bottom">
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_60%)]"></div>
        <div class="mx-auto w-full max-w-5xl px-6 py-28 text-center lg:px-10">
            <h2 class="text-3xl font-semibold text-white">Be first in line for the public launch</h2>
            <p class="mt-4 text-base text-zinc-300">We’re expanding access soon. Leave your email to receive release updates, feature drops, and a priority invite.</p>
            @if ($waitlistSuccess)
                <div class="mx-auto mt-8 max-w-xl rounded-md bg-emerald-100/10 p-4 text-sm font-medium text-emerald-300">{{ $waitlistSuccess }}</div>
            @else
                <form method="POST" action="{{ route('marketing.waitlist') }}" class="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
                    @csrf
                    <label for="waitlist-email-bottom" class="sr-only">Email</label>
                    <input
                        id="waitlist-email-bottom"
                        name="email"
                        type="email"
                        inputmode="email"
                        autocomplete="email"
                        required
                        placeholder="you@example.com"
                        class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-zinc-400 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                        value="{{ old('email') }}"
                    >
                    <button type="submit" class="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        Join the waitlist
                    </button>
                </form>
                @error('email')
                    <p class="mx-auto mt-2 max-w-xl text-sm text-rose-200">{{ $message }}</p>
                @enderror
            @endif
            <p class="mt-4 text-xs text-zinc-400">We’ll only email you about Vox Prismatic. Unsubscribe anytime.</p>
        </div>
    </section>
@endsection

@push('head')
    @if ($waitlistSuccess)
        <script>
            // Track successful waitlist signups as a conversion in Umami
            try { if (window.umami && typeof window.umami.track === 'function') { window.umami.track('waitlist_success'); } } catch (e) {}
        </script>
    @endif
@endpush
