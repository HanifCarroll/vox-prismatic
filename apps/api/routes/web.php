<?php

use App\Http\Controllers\Web\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Web\Auth\RegisteredUserController;
use App\Http\Controllers\Web\ProjectsController as WebProjectsController;
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

    Route::get('/projects', [WebProjectsController::class, 'index'])->name('projects.index');
    Route::get('/projects/new', [WebProjectsController::class, 'create'])->name('projects.create');
    Route::post('/projects', [WebProjectsController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [WebProjectsController::class, 'show'])->name('projects.show');
    Route::put('/projects/{project}', [WebProjectsController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [WebProjectsController::class, 'destroy'])->name('projects.destroy');
    Route::post('/projects/{project}/process', [WebProjectsController::class, 'process'])->name('projects.process');
});
