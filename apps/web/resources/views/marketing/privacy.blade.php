@extends('marketing.layout')

@section('title', 'Privacy Notice')
@section('meta_description', 'Understand how Vox Prismatic collects, uses, and protects your information during the closed beta.')

@section('content')
    <section class="bg-white">
        <div class="mx-auto w-full max-w-4xl px-6 py-24 lg:px-8">
            <h1 class="text-4xl font-semibold text-zinc-900">Privacy Notice</h1>
            <p class="mt-6 text-sm leading-6 text-zinc-600">Last updated: {{ now()->format('F j, Y') }}</p>
            <div class="mt-10 space-y-8 text-sm leading-7 text-zinc-600">
                <p>Vox Prismatic (“we”, “us”) is committed to respecting your privacy. This Privacy Notice explains how we collect, use, and safeguard the information you provide, including during the closed beta waitlist.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Information we collect</h2>
                <p>We collect information you provide directly to us, such as your name, email address, transcripts, and LinkedIn content drafts. When you join the waitlist, we collect your email to notify you about beta access.</p>
                <h2 class="text-lg font-semibold text-zinc-900">How we use your information</h2>
                <p>We use your information to operate and improve the Service, personalize generated content, communicate updates, and ensure compliance with LinkedIn’s policies. We do not sell your data.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Third-party services</h2>
                <p>We rely on trusted infrastructure providers (e.g., hosting, analytics, AI providers) to deliver the Service. These providers may process your information on our behalf under data-processing agreements.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Your choices</h2>
                <p>You can update or delete your account data by contacting support. If you joined the waitlist and no longer wish to receive updates, email us at <a href="mailto:hanif@voxprismatic.com" class="font-medium text-zinc-900 hover:underline">hanif@voxprismatic.com</a>.</p>
                <p>Questions about privacy? Reach out at <a href="mailto:hanif@voxprismatic.com" class="font-medium text-zinc-900 hover:underline">hanif@voxprismatic.com</a>.</p>
            </div>
        </div>
    </section>
@endsection
