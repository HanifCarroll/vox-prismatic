<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Vox Prismatic')</title>
    <meta name="description" content="@yield('meta_description', 'Vox Prismatic helps you transform your expertise into consistent, authentic LinkedIn content without the grind.')">
    @vite(['resources/css/app.css'])

    {{-- Umami (marketing only) --}}
    @if (app()->environment('production') && (config('services.umami.enabled') && config('services.umami.website_id') && config('services.umami.script_url')))
        <script defer src="{{ config('services.umami.script_url') }}" data-website-id="{{ config('services.umami.website_id') }}"></script>
    @endif

    {{-- Microsoft Clarity (marketing only) --}}
    @if (app()->environment('production') && (config('services.clarity.enabled') && config('services.clarity.project_id')))
        <script type="text/javascript">
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "{{ config('services.clarity.project_id') }}");
        </script>
    @endif
    @stack('head')
</head>
<body class="min-h-screen bg-white font-sans text-zinc-900">
    <div class="relative flex min-h-screen flex-col">
        <header class="border-b border-zinc-200/70">
            <nav class="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 md:py-8 lg:px-10">
                <a href="{{ route('marketing.home') }}" class="flex items-center gap-2 text-lg font-semibold text-zinc-900 hover:text-zinc-600" aria-label="Vox Prismatic home">
                    <span class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">VP</span>
                    <span>Vox Prismatic</span>
                </a>
                <div class="flex items-center gap-6 text-sm font-medium text-zinc-600">
                    @auth
                        <a href="{{ route('projects.index') }}" class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">Go to app</a>
                    @else
                        <a href="{{ route('login') }}" class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">Sign in</a>
                    @endauth
                </div>
            </nav>
        </header>

        <main class="flex-1">
            @yield('content')
        </main>

        <footer class="border-t border-zinc-200/70 bg-zinc-50">
            <div class="mx-auto flex w-full max-w-7xl flex-col justify-between gap-4 px-6 py-10 text-sm text-zinc-500 lg:flex-row lg:items-center lg:px-10">
                <p>&copy; {{ now()->year }} Vox Prismatic. All rights reserved.</p>
                <div class="flex flex-wrap items-center gap-4">
                    <a href="mailto:hello@voxprismatic.com" class="hover:text-zinc-700">hello@voxprismatic.com</a>
                    <a href="https://www.linkedin.com/in/hanifcarroll" class="hover:text-zinc-700" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    <a href="{{ route('marketing.terms') }}" class="hover:text-zinc-700">Terms</a>
                    <a href="{{ route('marketing.privacy') }}" class="hover:text-zinc-700">Privacy</a>
                </div>
            </div>
        </footer>
    </div>
    @stack('scripts')
</body>
</html>
