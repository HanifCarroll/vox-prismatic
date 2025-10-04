<?php

use Illuminate\Support\Facades\Route;

// Health
Route::get('/health', [\App\Http\Controllers\HealthController::class, 'index']);

// Auth (Sanctum SPA)
Route::prefix('auth')->group(function () {
    Route::get('/me', [\App\Http\Controllers\AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/logout', [\App\Http\Controllers\AuthController::class, 'logout'])->middleware('auth:sanctum');
    // SPA login/register to replace Supabase
    Route::post('/login', [\App\Http\Controllers\AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [\App\Http\Controllers\AuthController::class, 'register']);
});

// Projects
Route::prefix('projects')->middleware('auth:sanctum')->group(function () {
    Route::post('/', [\App\Http\Controllers\ProjectsController::class, 'create']);
    Route::get('/', [\App\Http\Controllers\ProjectsController::class, 'list']);
    Route::get('/{id}', [\App\Http\Controllers\ProjectsController::class, 'get']);
    Route::get('/{id}/status', [\App\Http\Controllers\ProjectsController::class, 'status']);
    Route::put('/{id}/stage', [\App\Http\Controllers\ProjectsController::class, 'updateStage']);
    Route::patch('/{id}', [\App\Http\Controllers\ProjectsController::class, 'update']);
    Route::delete('/{id}', [\App\Http\Controllers\ProjectsController::class, 'delete']);
    Route::post('/{id}/process', [\App\Http\Controllers\ProjectsController::class, 'process']); // SSE
    Route::get('/{id}/process/stream', [\App\Http\Controllers\ProjectsController::class, 'processStream']); // SSE
});

// Transcripts
Route::prefix('transcripts')->middleware('auth:sanctum')->group(function () {
    Route::post('/preview', [\App\Http\Controllers\TranscriptsController::class, 'preview']);
    Route::get('/{id}', [\App\Http\Controllers\TranscriptsController::class, 'get']);
    Route::put('/{id}', [\App\Http\Controllers\TranscriptsController::class, 'put']);
});

// Posts
Route::prefix('posts')->middleware('auth:sanctum')->group(function () {
    Route::get('/hooks/frameworks', [\App\Http\Controllers\PostsController::class, 'frameworks']);
    Route::get('/projects/{id}/posts', [\App\Http\Controllers\PostsController::class, 'listByProject']);
    Route::get('/scheduled', [\App\Http\Controllers\PostsController::class, 'listScheduled']);
    Route::get('/analytics', [\App\Http\Controllers\PostsController::class, 'analytics']);
    Route::get('/{id}', [\App\Http\Controllers\PostsController::class, 'get']);
    Route::patch('/{id}', [\App\Http\Controllers\PostsController::class, 'update']);
    Route::post('/{id}/publish', [\App\Http\Controllers\PostsController::class, 'publishNow']);
    Route::post('/{id}/auto-schedule', [\App\Http\Controllers\PostsController::class, 'autoSchedule']);
    // Aligned bulk status route (frontend uses PATCH /api/posts/bulk)
    Route::patch('/bulk', [\App\Http\Controllers\PostsController::class, 'bulkSetStatus']);
    Route::post('/bulk/regenerate', [\App\Http\Controllers\PostsController::class, 'bulkRegenerate']);
    Route::post('/{id}/hooks/workbench', [\App\Http\Controllers\PostsController::class, 'hookWorkbench']);
});

// Scheduling
Route::prefix('scheduling')->middleware('auth:sanctum')->group(function () {
    Route::get('/preferences', [\App\Http\Controllers\SchedulingController::class, 'getPreferences']);
    Route::put('/preferences', [\App\Http\Controllers\SchedulingController::class, 'updatePreferences']);
    Route::get('/slots', [\App\Http\Controllers\SchedulingController::class, 'getSlots']);
    Route::put('/slots', [\App\Http\Controllers\SchedulingController::class, 'updateSlots']);
});

// Settings
Route::prefix('settings')->middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [\App\Http\Controllers\SettingsController::class, 'profile']);
    Route::patch('/profile', [\App\Http\Controllers\SettingsController::class, 'updateProfile']);
    Route::patch('/password', [\App\Http\Controllers\SettingsController::class, 'updatePassword']);
    Route::get('/style', [\App\Http\Controllers\SettingsController::class, 'getStyle']);
    Route::put('/style', [\App\Http\Controllers\SettingsController::class, 'putStyle']);
});

// LinkedIn
Route::prefix('linkedin')->group(function () {
    Route::get('/auth', [\App\Http\Controllers\LinkedInController::class, 'auth'])->middleware(['auth:sanctum','throttle:linkedin-oauth']);
    Route::get('/callback', [\App\Http\Controllers\LinkedInController::class, 'callback'])->middleware('throttle:linkedin-oauth');
    Route::get('/status', [\App\Http\Controllers\LinkedInController::class, 'status'])->middleware('auth:sanctum');
    Route::post('/disconnect', [\App\Http\Controllers\LinkedInController::class, 'disconnect'])->middleware('auth:sanctum');
});

// Back-compat: /api/auth/linkedin/*
Route::prefix('auth/linkedin')->group(function () {
    Route::get('/auth', [\App\Http\Controllers\LinkedInController::class, 'auth'])->middleware('auth:sanctum');
    Route::get('/callback', [\App\Http\Controllers\LinkedInController::class, 'callback']);
});

// Billing
Route::prefix('billing')->middleware('auth:sanctum')->group(function () {
    Route::post('/checkout-session', [\App\Http\Controllers\BillingController::class, 'checkoutSession']);
    Route::post('/portal-session', [\App\Http\Controllers\BillingController::class, 'portalSession']);
    Route::get('/status', [\App\Http\Controllers\BillingController::class, 'status']);
});

// Stripe Webhook (Cashier)
Route::prefix('stripe')->group(function () {
    Route::post('/webhook', [\Laravel\Cashier\Http\Controllers\WebhookController::class, 'handleWebhook']);
});

// Admin
Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/usage', [\App\Http\Controllers\AdminController::class, 'usage']);
    Route::patch('/users/{userId}/trial', [\App\Http\Controllers\AdminController::class, 'updateTrial']);
});
