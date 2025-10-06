<?php

use App\Http\Controllers\Web\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Web\Auth\RegisteredUserController;
use App\Http\Controllers\Web\ProjectsController as WebProjectsController;
use App\Http\Controllers\Web\PostsController as WebPostsController;
use App\Http\Controllers\Web\SettingsController as WebSettingsController;
use App\Http\Controllers\Web\LinkedInController as WebLinkedInController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/projects')->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');

    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register.store');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    // Analytics
    Route::get('/analytics', [\App\Http\Controllers\Web\AnalyticsController::class, 'index'])->name('analytics.index');

    // Calendar
    Route::get('/calendar', [\App\Http\Controllers\Web\CalendarController::class, 'index'])->name('calendar.index');

    Route::get('/projects', [WebProjectsController::class, 'index'])->name('projects.index');
    // Redirect bare project URL to explicit transcript section for deep linking
    Route::get('/projects/{project}', function ($project) {
        return redirect()->route('projects.show.tab', ['project' => $project, 'tab' => 'transcript']);
    })->name('projects.show');
    Route::get('/projects/new', [WebProjectsController::class, 'create'])->name('projects.create');
    Route::post('/projects', [WebProjectsController::class, 'store'])->name('projects.store');
    // Project detail with tab in path
    Route::get('/projects/{project}/{tab}', [WebProjectsController::class, 'show'])
        ->whereIn('tab', ['transcript', 'posts'])
        ->name('projects.show.tab');
    Route::put('/projects/{project}', [WebProjectsController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [WebProjectsController::class, 'destroy'])->name('projects.destroy');
    Route::post('/projects/{project}/process', [WebProjectsController::class, 'process'])->name('projects.process');

    // Posts (web endpoints for Inertia UI)
    Route::patch('/projects/{project}/posts/{post}', [WebPostsController::class, 'update'])->name('projects.posts.update');
    Route::post('/projects/{project}/posts/bulk-status', [WebPostsController::class, 'bulkStatus'])->name('projects.posts.bulk-status');
    Route::post('/projects/{project}/posts/bulk-regenerate', [WebPostsController::class, 'bulkRegenerate'])->name('projects.posts.bulk-regenerate');
    Route::post('/projects/{project}/posts/{post}/publish', [WebPostsController::class, 'publish'])->name('projects.posts.publish');
    Route::post('/projects/{project}/posts/{post}/schedule', [WebPostsController::class, 'schedule'])->name('projects.posts.schedule');
    Route::delete('/projects/{project}/posts/{post}/schedule', [WebPostsController::class, 'unschedule'])->name('projects.posts.unschedule');
    Route::post('/projects/{project}/posts/{post}/auto-schedule', [WebPostsController::class, 'autoSchedule'])->name('projects.posts.auto-schedule');
    Route::post('/projects/{project}/posts/auto-schedule', [WebPostsController::class, 'autoScheduleProject'])->name('projects.posts.auto-schedule-project');

    Route::get('/settings', [WebSettingsController::class, 'index'])->name('settings.index');
    Route::put('/settings/style', [WebSettingsController::class, 'putStyle'])->name('settings.style.put');
    Route::put('/settings/scheduling/preferences', [WebSettingsController::class, 'updatePreferences'])->name('settings.scheduling.preferences');
    Route::put('/settings/scheduling/slots', [WebSettingsController::class, 'updateSlots'])->name('settings.scheduling.slots');
    Route::post('/settings/linked-in/disconnect', [WebSettingsController::class, 'disconnectLinkedIn'])->name('settings.linkedin.disconnect');
    Route::get('/settings/linked-in/auth', [WebLinkedInController::class, 'auth'])->name('settings.linkedin.auth');
});
