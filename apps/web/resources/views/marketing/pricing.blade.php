@extends('marketing.layout')

@section('title', 'Pricing')
@section('meta_description', 'Vox Prismatic is in closed beta. See how pricing will work when we open access and join the waitlist to be first in line.')

@section('content')
    <section class="bg-white">
        <div class="mx-auto w-full max-w-4xl px-6 py-24 text-center lg:px-8">
            <h1 class="text-4xl font-semibold text-zinc-900">Pricing</h1>
            <p class="mt-6 text-lg leading-8 text-zinc-600">We’re currently in closed beta with early customers. Public plans will roll out as we expand access.</p>
            <div class="mt-12 grid gap-8 text-left sm:grid-cols-2">
                <div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <h2 class="text-xl font-semibold text-zinc-900">Creator</h2>
                    <p class="mt-4 text-sm leading-6 text-zinc-600">For solo operators and founders who want to publish consistently without outsourcing their voice.</p>
                    <ul class="mt-6 space-y-2 text-sm text-zinc-600">
                        <li>• Unlimited projects and transcripts</li>
                        <li>• 5–10 LinkedIn drafts per upload</li>
                        <li>• Scheduling and publishing for LinkedIn</li>
                    </ul>
                </div>
                <div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <h2 class="text-xl font-semibold text-zinc-900">Studio (coming later)</h2>
                    <p class="mt-4 text-sm leading-6 text-zinc-600">For agencies coordinating across multiple experts, clients, or executives.</p>
                    <ul class="mt-6 space-y-2 text-sm text-zinc-600">
                        <li>• Shared workspace with roles</li>
                        <li>• Approval workflows and bulk actions</li>
                        <li>• Priority support and onboarding</li>
                    </ul>
                </div>
            </div>
            <p class="mt-12 text-sm text-zinc-600">Want in early? <a href="{{ route('marketing.home') }}#email" class="font-medium text-zinc-900 hover:underline">Join the waitlist</a> and we’ll follow up with beta pricing.</p>
        </div>
    </section>
@endsection
