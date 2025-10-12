@extends('marketing.layout')

@section('title', 'Terms of Service')
@section('meta_description', 'Review the Vox Prismatic terms of service for using our closed beta product and related services.')

@section('content')
    <section class="bg-white">
        <div class="mx-auto w-full max-w-4xl px-6 py-24 lg:px-8">
            <h1 class="text-4xl font-semibold text-zinc-900">Terms of Service</h1>
            <p class="mt-6 text-sm leading-6 text-zinc-600">Last updated: {{ now()->format('F j, Y') }}</p>
            <div class="mt-10 space-y-8 text-sm leading-7 text-zinc-600">
                <p>By accessing or using Vox Prismatic (the “Service”), you agree to these Terms of Service. If you are participating in the closed beta, additional onboarding agreements may apply.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Use of the Service</h2>
                <p>You may use the Service only for lawful purposes and in accordance with these Terms. You are responsible for safeguarding your account credentials and for all activity conducted under your account.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Content ownership</h2>
                <p>You retain ownership of the content you upload or generate with Vox Prismatic. We may temporarily process your data to provide the Service, including transforming transcripts into LinkedIn drafts.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Beta features</h2>
                <p>The Service is currently in closed beta and is provided “as is.” Features may change without notice. We appreciate feedback and may reach out to learn how we can improve the experience.</p>
                <h2 class="text-lg font-semibold text-zinc-900">Privacy</h2>
                <p>Your use of the Service is also governed by our <a href="{{ route('marketing.privacy') }}" class="font-medium text-zinc-900 hover:underline">Privacy Notice</a>.</p>
                <p>If you have any questions about these Terms, contact us at <a href="mailto:hanif@voxprismatic.com" class="font-medium text-zinc-900 hover:underline">hanif@voxprismatic.com</a>.</p>
            </div>
        </div>
    </section>
@endsection
