<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @php
        $reverbApp = data_get(config('reverb.apps.apps'), 0, []);
        $reverbOptions = data_get($reverbApp, 'options', []);
    @endphp
    @php
        $reverbConfig = [
            'key' => $reverbApp['key'] ?? null,
            'host' => $reverbOptions['host'] ?? null,
            'port' => $reverbOptions['port'] ?? null,
            'scheme' => $reverbOptions['scheme'] ?? null,
        ];
    @endphp
    <script>
        window.__REVERB_CONFIG__ = @js($reverbConfig);
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @inertiaHead
</head>
<body class="min-h-screen bg-zinc-50 font-sans antialiased text-zinc-900">
    @inertia
</body>
</html>
