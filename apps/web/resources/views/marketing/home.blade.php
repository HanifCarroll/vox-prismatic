@extends('marketing.layout')

@section('title', 'Your expertise, amplified | Vox Prismatic')
@section('meta_description', 'Stop letting your best thought leadership disappear after a call. Vox Prismatic turns transcripts into authentic, high-impact LinkedIn posts in minutes.')

@section('content')
    @php
        $waitlistHasSuccess = (bool) $waitlistSuccess;
        $waitlistDefaultMessage = 'Thanks! We will let you know when the beta opens up.';
        $waitlistErrorMessage = $errors->first();
        $waitlistBetaIdempotencyKey = (string) \Illuminate\Support\Str::uuid();
    @endphp

    <section id="hero" class="relative overflow-hidden bg-zinc-50">
        <div class="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-100 via-white to-zinc-100"></div>
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.08),_transparent_65%)]"></div>
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 py-28 md:py-32 lg:flex-row lg:items-center lg:gap-28 lg:py-40 lg:px-10">
            <div class="w-full lg:max-w-xl">
                <span class="inline-flex items-center gap-2 rounded-full bg-zinc-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700">
                    Closed beta now onboarding
                </span>
                <h1 class="mt-8 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                    <span class="block">Your Expertise, Amplified.</span>
                    <span class="block text-zinc-800">Turn Client Calls into LinkedIn Influence.</span>
                </h1>
                <p class="mt-7 text-lg leading-8 text-zinc-600">
                    Stop letting your best thought leadership disappear after a call. Vox Prismatic intelligently transforms your transcripts into authentic, high-impact LinkedIn posts that attract clients—in minutes, not hours.
                </p>
                <div class="mt-10 flex flex-col gap-3">
                    <a
                        href="#founding-users"
                        class="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:w-auto"
                    >
                        Request Exclusive Access to the Beta
                    </a>
                    <p class="text-sm text-zinc-500">Join a small group of experts shaping the product.</p>
                </div>
            </div>
            <div class="relative w-full max-w-2xl lg:flex-1">
                <div class="absolute -left-12 top-10 hidden h-44 w-44 rounded-full bg-indigo-400/30 blur-3xl lg:block" aria-hidden="true"></div>
                <div class="absolute -right-16 bottom-4 hidden h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl lg:block" aria-hidden="true"></div>
                <figure class="relative overflow-hidden rounded-4xl border border-zinc-200/70 bg-white shadow-2xl shadow-zinc-900/10">
                    <div class="absolute inset-x-0 top-0 flex items-center justify-between border-b border-zinc-200/80 bg-zinc-50/90 px-5 py-3">
                        <div class="flex items-center gap-1.5">
                            <span class="h-2.5 w-2.5 rounded-full bg-indigo-400"></span>
                            <span class="h-2.5 w-2.5 rounded-full bg-indigo-400"></span>
                            <span class="h-2.5 w-2.5 rounded-full bg-indigo-400"></span>
                        </div>
                        <span class="text-xs font-medium text-zinc-500">vox-prismatic.app</span>
                    </div>
                    <div class="relative">
                        <img
                            src="{{ asset('images/posts-screen.png') }}"
                            alt="Vox Prismatic posts workspace showing generated drafts"
                            class="w-full object-cover"
                        >
                    </div>
                    <figcaption class="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/80 bg-zinc-50/80 px-5 py-4 text-xs text-zinc-600">
                        <div class="flex items-center gap-2 font-medium text-zinc-700">
                            <svg class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            Approved content ready to publish
                        </div>
                        <p class="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">Real workflow captured inside the product.</p>
                    </figcaption>
                </figure>
                <div class="absolute -bottom-10 right-12 hidden w-52 rounded-2xl border border-white/60 bg-white/90 p-4 text-xs shadow-lg backdrop-blur lg:block">
                    <p class="font-semibold text-zinc-800">Track progress at every stage.</p>
                    <p class="mt-2 text-[0.7rem] text-zinc-500">See insight extraction, drafting, and scheduling move in real time.</p>
                </div>
            </div>
        </div>
    </section>

    <section id="problem" class="border-t border-zinc-200/70 bg-gradient-to-b from-white via-zinc-50/60 to-white">
        <div class="relative">
            <div class="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/30 via-transparent to-transparent blur-3xl" aria-hidden="true"></div>
            <div class="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-10 rounded-full bg-gradient-to-br from-indigo-200/30 via-transparent to-transparent blur-3xl" aria-hidden="true"></div>
        </div>
        <div class="relative mx-auto w-full max-w-6xl px-6 py-28 lg:px-10">
            <div class="grid items-start gap-16 lg:grid-cols-[1.1fr,0.9fr]">
                <div>
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">The Content Treadmill</span>
                    <h2 class="mt-5 text-3xl font-semibold text-zinc-900 sm:text-4xl">You’re a Trusted Expert. But Does Your LinkedIn Show It?</h2>
                    <p class="mt-5 text-base leading-7 text-zinc-600">
                        Your most valuable insights are shared in conversations, not in a content calendar. When that brilliance never makes it to LinkedIn, your future clients miss the breakthroughs you deliver every day.
                    </p>
                    <div class="mt-10 rounded-3xl border border-indigo-200/60 bg-white/80 p-8 text-base text-indigo-700 shadow-sm shadow-indigo-100/40">
                        <p class="font-semibold text-indigo-800">Common roadblock we hear from teams:</p>
                        <p class="mt-2 text-sm text-indigo-500">Promising a weekly cadence without a capture system leads to missed opportunities and inconsistent visibility.</p>
                    </div>
                </div>
                <div class="relative overflow-hidden rounded-4xl border border-indigo-100/70 bg-white/90 p-10 shadow-lg shadow-indigo-100/60">
                    <div class="absolute left-8 top-12 bottom-12 hidden w-px bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent md:block" aria-hidden="true"></div>
                    <dl class="space-y-10">
                        <div class="relative pl-12">
                            <span class="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-600 ring-1 ring-indigo-200/60">01</span>
                            <dt class="text-base font-semibold text-zinc-900">The Blank Page</dt>
                            <dd class="mt-3 text-sm leading-6 text-zinc-600">You know you should post, but writing from scratch takes hours you don’t have.</dd>
                        </div>
                        <div class="relative pl-12">
                            <span class="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-600 ring-1 ring-indigo-200/60">02</span>
                            <dt class="text-base font-semibold text-zinc-900">The Lost Wisdom</dt>
                            <dd class="mt-3 text-sm leading-6 text-zinc-600">You wrap a call overflowing with “aha” moments, then jump to the next meeting—and the insight never reaches your wider audience.</dd>
                        </div>
                        <div class="relative pl-12">
                            <span class="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-600 ring-1 ring-indigo-200/60">03</span>
                            <dt class="text-base font-semibold text-zinc-900">The Authenticity Gap</dt>
                            <dd class="mt-3 text-sm leading-6 text-zinc-600">Templated content sounds nothing like you, so your online presence feels disconnected from the real value you provide.</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    </section>

    <section id="solution" class="border-t border-zinc-200/70 bg-zinc-50">
        <div class="mx-auto w-full max-w-6xl px-6 py-28 lg:px-10">
            <div class="grid items-start gap-16 lg:grid-cols-[0.9fr,1.1fr]">
                <div>
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">The “Aha!” Moment, Captured</span>
                    <h2 class="mt-5 text-3xl font-semibold text-zinc-900 sm:text-4xl">Introducing Vox Prismatic: Your Effortless Content Engine.</h2>
                    <p class="mt-5 text-base leading-7 text-zinc-600">We don’t create your genius—we help you capture, refine, and share it.</p>
                    <ul class="mt-8 space-y-3 text-sm leading-6 text-zinc-600">
                        <li class="flex items-start gap-3">
                            <span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>
                            Post drafts stay grounded in the transcript you provide—insights are pulled first, then shaped into LinkedIn-ready copy.
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>
                            Review every post inside the project workspace before it can be scheduled or published.
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>
                            Processing progress streams over WebSockets so you see each stage complete without refreshing.
                        </li>
                    </ul>
                </div>
                <div>
                    <ol class="mt-6 space-y-12">
                        <li class="relative grid gap-6 border-l-2 border-zinc-200/80 pl-6 lg:grid-cols-[minmax(0,0.65fr),1fr] lg:pl-12">
                            <span class="absolute -left-11 top-0 hidden text-5xl font-semibold text-zinc-200 lg:block" aria-hidden="true">01</span>
                            <div class="space-y-3">
                                <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Capture</span>
                                <h3 class="text-xl font-semibold text-zinc-900">Kick Off with Your Transcript</h3>
                                <p class="text-sm leading-6 text-zinc-600">Paste the transcript or meeting notes from your session. Saving immediately moves the project into the processing stage.</p>
                            </div>
                            <div class="grid gap-4 sm:grid-cols-2">
                                <div class="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-xs leading-5 text-zinc-600">
                                    <p class="font-semibold text-zinc-800">Paste raw text</p>
                                    <p class="mt-2">Projects accept plain-text transcripts (minimum 10 characters), so you can drop in exports from Zoom, Meet, or your note-taking app.</p>
                                </div>
                                <div class="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-xs leading-5 text-zinc-600">
                                    <p class="font-semibold text-zinc-800">Queued automatically</p>
                                    <p class="mt-2">The backend enqueues the GenerateInsightsJob on our processing queue and emits a project.progress update the moment work begins.</p>
                                </div>
                            </div>
                        </li>
                        <li class="relative grid gap-6 border-l-2 border-zinc-200/80 pl-6 lg:grid-cols-[minmax(0,0.65fr),1fr] lg:pl-12">
                            <span class="absolute -left-11 top-0 hidden text-5xl font-semibold text-zinc-200 lg:block" aria-hidden="true">02</span>
                            <div class="space-y-3">
                            <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Draft</span>
                                <h3 class="text-xl font-semibold text-zinc-900">Turn Insights into LinkedIn Drafts</h3>
                                <p class="text-sm leading-6 text-zinc-600">GeneratePostsJob walks each insight through your saved writing style and objective schedule, producing 5–10 drafts ready for review.</p>
                            </div>
                            <div class="space-y-4">
                                <div class="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-700">
                                    <p class="font-semibold text-indigo-800">Writing style controls</p>
                                    <p class="mt-1 text-indigo-700">Set your tone (Confident, Friendly expert, Builder, Challenger, or Inspiring), perspective, and positioning inside Settings and we apply it to every draft.</p>
                                </div>
                                <div class="rounded-2xl border border-zinc-200/80 bg-white p-4 text-sm leading-6 text-zinc-600">
                                    <p class="font-semibold text-zinc-800">Context-aware drafting</p>
                                    <p class="mt-1">InsightContextBuilder sends surrounding transcript passages with each request, so hooks and quotes stay anchored to what you actually said.</p>
                                </div>
                            </div>
                        </li>
                        <li class="relative grid gap-6 border-l-2 border-zinc-200/80 pl-6 lg:grid-cols-[minmax(0,0.65fr),1fr] lg:pl-12">
                            <span class="absolute -left-11 top-0 hidden text-5xl font-semibold text-zinc-200 lg:block" aria-hidden="true">03</span>
                            <div class="space-y-3">
                                <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Publish</span>
                                <h3 class="text-xl font-semibold text-zinc-900">Schedule with Confidence</h3>
                                <p class="text-sm leading-6 text-zinc-600">Approve, edit, and schedule in one click. Only approved posts can enter the queue, and LinkedIn publishing requires an active connection.</p>
                            </div>
                            <div class="grid gap-4 text-xs text-zinc-600">
                                <div class="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3">
                                    <div>
                                        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">Next publish</p>
                                        <p class="text-sm font-medium text-zinc-800">Tomorrow · 9:12 AM</p>
                                    </div>
                                    <span class="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white">
                                        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3A1 1 0 006 2z" />
                                        </svg>
                                        Scheduled
                                    </span>
                                </div>
                                <div class="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-4 py-4 text-indigo-700">
                                    <p class="font-semibold text-indigo-800">Smart queue</p>
                                    <p class="mt-1 leading-5">Auto-scheduling fills the preferred timeslots you save in Settings and respects your lead-time buffer.</p>
                                </div>
                                <div class="grid gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 sm:grid-cols-2">
                                    <div>
                                        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">Channels</p>
                                        <p class="text-sm font-medium text-zinc-800">LinkedIn (UGC)</p>
                                    </div>
                                    <div>
                                        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">Status</p>
                                        <p class="text-sm font-medium text-indigo-600">Approved</p>
                                    </div>
                                </div>
                                <div class="rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-zinc-600">
                                    <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">Hands-off publishing</p>
                                    <p class="mt-1 leading-5 text-xs">Our scheduled posts:publish-due command runs on the worker to push approved posts live the moment they’re due.</p>
                                </div>
                            </div>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    </section>

    <section id="audience" class="border-t border-zinc-200/70 bg-white">
        <div class="mx-auto w-full max-w-6xl px-6 py-28 lg:px-10">
            <div class="grid items-start gap-16 lg:grid-cols-[1.1fr,0.9fr]">
                <div>
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Who Is This For?</span>
                    <h2 class="mt-5 text-3xl font-semibold text-zinc-900 sm:text-4xl">Designed for Experts Who Monetize Their Knowledge.</h2>
                    <p class="mt-5 text-base leading-7 text-zinc-600">If you advise, coach, or lead others through transformation, Vox Prismatic keeps your insights working long after the call.</p>
                    <dl class="mt-12 divide-y divide-zinc-200/80 rounded-4xl border border-zinc-200/80 bg-zinc-50/60">
                        <div class="grid gap-3 px-6 py-6 lg:grid-cols-[9rem,1fr] lg:gap-8">
                            <dt class="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Coaches</dt>
                            <dd class="text-sm leading-6 text-zinc-700">
                                Transform client breakthroughs into compelling content that attracts your ideal, high-ticket coachees.
                                <ul class="mt-4 space-y-2 text-xs text-zinc-500">
                                    <li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>Ship a recap thread within 24 hours of a session.</li>
                                    <li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>Build authority while your calendar stays packed.</li>
                                </ul>
                            </dd>
                        </div>
                        <div class="grid gap-3 px-6 py-6 lg:grid-cols-[9rem,1fr] lg:gap-8">
                            <dt class="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Consultants</dt>
                            <dd class="text-sm leading-6 text-zinc-700">
                                Show the strategic thinking behind your engagements and keep prospects warm between projects.
                                <ul class="mt-4 space-y-2 text-xs text-zinc-500">
                                    <li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>Turn workshop transcripts into a client-facing LinkedIn carousel.</li>
                                    <li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>Highlight measurable outcomes without breaching confidentiality.</li>
                                </ul>
                            </dd>
                        </div>
                        <div class="grid gap-3 px-6 py-6 lg:grid-cols-[9rem,1fr] lg:gap-8">
                            <dt class="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Fractional Leaders</dt>
                            <dd class="text-sm leading-6 text-zinc-700">
                                Keep your portfolio companies aligned while attracting the next dream engagement with credibility-building posts.
                                <ul class="mt-4 space-y-2 text-xs text-zinc-500">
                                    <li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>Share “board-ready” summaries with your network.</li>
                                    <li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-indigo-400"></span>Spot the ideas worth scaling across clients.</li>
                                </ul>
                            </dd>
                        </div>
                    </dl>
                </div>
                <aside class="space-y-6 rounded-4xl border border-zinc-200/80 bg-zinc-50/80 p-8 shadow-sm shadow-zinc-900/5">
                    <div>
                        <h3 class="text-lg font-semibold text-zinc-900">How they work with Vox Prismatic</h3>
                        <p class="mt-2 text-sm leading-6 text-zinc-600">Every plan includes collaborative review, shared libraries, and analytics tuned for LinkedIn.</p>
                    </div>
                    <ul class="space-y-4 text-sm leading-6 text-zinc-700">
                        <li class="flex items-start gap-3">
                            <span class="mt-1 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-400"></span>
                            Batch process project updates, yet drip release them with dynamic scheduling.
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="mt-1 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-400"></span>
                            Keep clients in the loop via private review links before anything goes live.
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="mt-1 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-400"></span>
                            Compare performance with cohort benchmarks to refine your playbook.
                        </li>
                    </ul>
                    <div class="rounded-3xl border border-indigo-200/70 bg-white/80 p-6 text-sm leading-6 text-zinc-700">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Workflow spotlight</p>
                        <p class="mt-3 text-lg font-semibold text-zinc-900">Upload transcripts weekly · curate insights · approve LinkedIn-ready drafts</p>
                        <p class="mt-3 text-xs text-zinc-500">A repeatable cadence for fractional leaders staying visible between engagements.</p>
                    </div>
                </aside>
            </div>
        </div>
    </section>

    <section id="benefits" class="border-t border-zinc-200/70 bg-zinc-50">
        <div class="mx-auto w-full max-w-6xl px-6 py-28 lg:px-10">
            <div class="max-w-3xl">
                <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Key Benefits</span>
                <h2 class="mt-5 text-3xl font-semibold text-zinc-900 sm:text-4xl">More Than an AI—it’s Your Personal Content Strategist.</h2>
            </div>
            <div class="mt-12 grid gap-6 lg:grid-cols-3">
                <div class="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <h3 class="text-xl font-semibold text-zinc-900">Uncover Hidden Gems in Your Own Words</h3>
                    <p class="mt-4 text-sm leading-6 text-zinc-600">Our AI pinpoints the most resonant “aha” moments and powerful stories from your calls, turning them into content that connects and converts.</p>
                </div>
                <div class="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <h3 class="text-xl font-semibold text-zinc-900">Sound Like You, Every Single Time</h3>
                    <p class="mt-4 text-sm leading-6 text-zinc-600">Infuse every post with your signature voice, offers, and ideal customer profile. It’s your expertise, in your words, tuned for your audience.</p>
                </div>
                <div class="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <h3 class="text-xl font-semibold text-zinc-900">Build Your LinkedIn Presence on Autopilot</h3>
                    <p class="mt-4 text-sm leading-6 text-zinc-600">Reclaim your time and show up consistently. Set your posting preferences once and let Vox Prismatic handle the follow-through.</p>
                </div>
            </div>
        </div>
    </section>

    <section id="founding-users" class="relative overflow-hidden bg-zinc-900">
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_55%)]"></div>
        <div class="mx-auto w-full max-w-5xl px-6 py-32 lg:px-10">
            <div class="mx-auto max-w-3xl text-center">
                <span class="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-200">Founding Beta Invitation</span>
                <h2 class="mt-6 text-3xl font-semibold text-white sm:text-4xl">Become a Founding User and Shape the Future of Expert Content.</h2>
                <p class="mt-4 text-base text-zinc-300">
                    We’re inviting a small group of coaches, consultants, and executives to join our closed beta. Your direct feedback will guide the roadmap.
                </p>
            </div>
            <div
                id="founding-users-success"
                @class([
                    'mx-auto mt-10 max-w-2xl rounded-lg bg-indigo-100/10 px-6 py-4 text-sm font-medium text-indigo-300 shadow-sm',
                    'hidden' => ! $waitlistHasSuccess,
                ])
                role="status"
                aria-live="polite"
                tabindex="-1"
                data-waitlist-success
            >
                {{ $waitlistHasSuccess ? $waitlistSuccess : '' }}
            </div>
            <form
                method="POST"
                action="{{ route('marketing.waitlist') }}"
                @class([
                    'mx-auto mt-10 grid max-w-3xl gap-6 rounded-3xl border border-white/15 bg-white/10 p-8 shadow-lg backdrop-blur',
                    'hidden' => $waitlistHasSuccess,
                ])
                data-waitlist-form
                data-waitlist-success-default="{{ $waitlistDefaultMessage }}"
                data-waitlist-error-target="#founding-users-error"
            >
                @csrf
                <input type="hidden" name="idempotency_key" value="{{ $waitlistBetaIdempotencyKey }}">
                <div>
                    <label for="waitlist-email" class="text-sm font-semibold text-white">Email</label>
                    <input
                        id="waitlist-email"
                        name="email"
                        type="email"
                        inputmode="email"
                        autocomplete="email"
                        required
                        placeholder="you@example.com"
                        class="mt-2 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-zinc-300 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                        value="{{ old('email') }}"
                        @error('email') aria-invalid="true" aria-describedby="waitlist-email-error" @enderror
                    >
                    <p
                        id="waitlist-email-error"
                        @class([
                            'mt-2 text-xs text-indigo-200',
                            'hidden' => ! $errors->first('email'),
                        ])
                        data-field-error="email"
                        role="alert"
                    >
                        {{ $errors->first('email') }}
                    </p>
                </div>
                <button
                    type="submit"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:w-auto"
                    data-waitlist-submit
                >
                    <span data-button-label>Request My Exclusive Invite</span>
                    <svg
                        class="hidden h-4 w-4 animate-spin text-zinc-900"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        data-button-spinner
                    >
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                </button>
                <p class="text-sm text-zinc-200">What you get as a beta tester:</p>
                <ul class="grid gap-3 text-sm text-zinc-100 sm:grid-cols-3">
                    <li class="flex items-start gap-2">
                        <span class="mt-1 inline-flex h-2 w-2 rounded-full bg-indigo-400" aria-hidden="true"></span>
                        Completely free, early access to all features.
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="mt-1 inline-flex h-2 w-2 rounded-full bg-indigo-400" aria-hidden="true"></span>
                        A direct line to me to share feedback and ideas.
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="mt-1 inline-flex h-2 w-2 rounded-full bg-indigo-400" aria-hidden="true"></span>
                        Influence over the roadmap as we build together.
                    </li>
                </ul>
                <p
                    id="founding-users-error"
                    @class([
                        'rounded-lg border border-indigo-300/40 bg-indigo-100/10 px-4 py-3 text-sm text-indigo-200',
                        'hidden' => ! $waitlistErrorMessage,
                    ])
                    data-waitlist-error
                    role="alert"
                    tabindex="-1"
                >
                    {{ $waitlistErrorMessage }}
                </p>
            </form>
        </div>
    </section>

@endsection

@push('head')
    @if ($waitlistSuccess)
        <script>
            try {
                if (window.umami && typeof window.umami.track === 'function') {
                    window.umami.track('waitlist_success');
                }
            } catch (e) {}
        </script>
    @endif
@endpush

@push('scripts')
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            const forms = Array.from(document.querySelectorAll('[data-waitlist-form]'));
            if (!forms.length) {
                return;
            }

            const successContainers = Array.from(document.querySelectorAll('[data-waitlist-success]'));
            const FIELD_NAMES = ['email'];

            const resolveErrorElement = (form) => {
                const inline = form.querySelector('[data-waitlist-error]');
                if (inline) {
                    return inline;
                }

                const selector = form.dataset.waitlistErrorTarget;
                if (selector) {
                    return document.querySelector(selector);
                }

                return null;
            };

            const defaultMessage = (form) =>
                form.dataset.waitlistSuccessDefault || 'Thanks! We will let you know when the beta opens up.';

            const setLoading = (button, isLoading) => {
                button.dataset.loading = isLoading ? 'true' : 'false';
                button.disabled = isLoading;
                button.setAttribute('aria-disabled', isLoading ? 'true' : 'false');

                const spinner = button.querySelector('[data-button-spinner]');
                if (spinner) {
                    spinner.classList.toggle('hidden', !isLoading);
                }

                const label = button.querySelector('[data-button-label]');
                if (label) {
                    label.classList.toggle('opacity-70', isLoading);
                }
            };

            const clearError = (form) => {
                const errorElement = resolveErrorElement(form);
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.classList.add('hidden');
                }

                FIELD_NAMES.forEach((field) => {
                    const input = form.querySelector(`[name="${field}"]`);
                    if (input) {
                        input.removeAttribute('aria-invalid');
                        input.removeAttribute('aria-describedby');
                    }

                    const fieldError = form.querySelector(`[data-field-error="${field}"]`);
                    if (fieldError) {
                        fieldError.textContent = '';
                        fieldError.classList.add('hidden');
                    }
                });
            };

            const setErrors = (form, { fieldErrors = {}, generalMessage = '', focusField = null } = {}) => {
                let firstMessage = generalMessage || '';
                let focusTarget = focusField ? form.querySelector(`[name="${focusField}"]`) : null;

                FIELD_NAMES.forEach((field) => {
                    const messages = Array.isArray(fieldErrors[field])
                        ? fieldErrors[field]
                        : fieldErrors[field]
                        ? [fieldErrors[field]]
                        : [];

                    const input = form.querySelector(`[name="${field}"]`);
                    const fieldError = form.querySelector(`[data-field-error="${field}"]`);

                    if (messages.length) {
                        if (fieldError) {
                            fieldError.textContent = messages[0];
                            fieldError.classList.remove('hidden');
                        }

                        if (!firstMessage) {
                            firstMessage = messages[0];
                        }

                        if (input) {
                            input.setAttribute('aria-invalid', 'true');
                            if (fieldError?.id) {
                                input.setAttribute('aria-describedby', fieldError.id);
                            }
                            if (!focusTarget) {
                                focusTarget = input;
                            }
                        }
                    } else {
                        if (fieldError) {
                            fieldError.textContent = '';
                            fieldError.classList.add('hidden');
                        }

                        if (input) {
                            input.removeAttribute('aria-invalid');
                            input.removeAttribute('aria-describedby');
                        }
                    }
                });

                const errorElement = resolveErrorElement(form);
                if (errorElement) {
                    if (firstMessage) {
                        errorElement.textContent = firstMessage;
                        errorElement.classList.remove('hidden');
                        if (!errorElement.hasAttribute('tabindex')) {
                            errorElement.setAttribute('tabindex', '-1');
                        }
                    } else {
                        errorElement.textContent = '';
                        errorElement.classList.add('hidden');
                    }
                }

                if (focusTarget) {
                    focusTarget.focus();
                } else if (firstMessage && errorElement) {
                    errorElement.focus();
                }
            };

            const showSuccess = (message) => {
                successContainers.forEach((container, index) => {
                    container.textContent = message;
                    container.classList.remove('hidden');
                    if (!container.hasAttribute('aria-live')) {
                        container.setAttribute('aria-live', 'polite');
                    }
                    if (!container.hasAttribute('tabindex')) {
                        container.setAttribute('tabindex', '-1');
                    }
                    if (index === 0) {
                        container.focus();
                    }
                });

                forms.forEach((form) => {
                    form.classList.add('hidden');
                });

                if (window.umami && typeof window.umami.track === 'function') {
                    try {
                        window.umami.track('waitlist_success');
                    } catch (error) {
                        // ignore analytics errors
                    }
                }
            };

            forms.forEach((form) => {
                form.addEventListener('submit', async (event) => {
                    event.preventDefault();

                    const submitButton = form.querySelector('[data-waitlist-submit]');
                    if (!submitButton || submitButton.dataset.loading === 'true') {
                        return;
                    }

                    clearError(form);

                    const idempotencyInput = form.querySelector('input[name="idempotency_key"]');
                    if (idempotencyInput) {
                        const generatedKey =
                            window.crypto && typeof window.crypto.randomUUID === 'function'
                                ? window.crypto.randomUUID()
                                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                        idempotencyInput.value = generatedKey;
                    }

                    setLoading(submitButton, true);

                    const formData = new FormData(form);

                    try {
                        const response = await fetch(form.action, {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            body: formData,
                        });

                        if (response.ok) {
                            const payload = await response.json().catch(() => ({}));
                            const message = payload.message || defaultMessage(form);
                            showSuccess(message);
                            return;
                        }

                        if (response.status === 422) {
                            const payload = await response.json().catch(() => ({}));
                            const fieldErrors = payload.errors || {};
                            const orderedFields = FIELD_NAMES;

                            const firstMessage =
                                orderedFields
                                    .map((field) => (Array.isArray(fieldErrors[field]) ? fieldErrors[field][0] : null))
                                    .find((msg) => !!msg) ||
                                payload.message ||
                                'Please review the highlighted fields.';

                            setErrors(form, {
                                fieldErrors,
                                generalMessage: firstMessage,
                                focusField:
                                    orderedFields.find(
                                        (field) => Array.isArray(fieldErrors[field]) && fieldErrors[field].length > 0
                                    ) || null,
                            });
                            return;
                        }

                        throw new Error(`Unexpected response: ${response.status}`);
                    } catch (error) {
                        setErrors(form, {
                            generalMessage: 'Something went wrong. Please try again.',
                        });
                    } finally {
                        setLoading(submitButton, false);
                    }
                });
            });
        });
    </script>
@endpush
