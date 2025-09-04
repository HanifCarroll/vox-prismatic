import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  // Authentication routes - accessible only when NOT authenticated
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [noAuthGuard]
  },
  // OAuth callback routes - require authentication to associate tokens with user
  {
    path: 'auth/linkedin/callback',
    loadComponent: () => import('./features/auth/linkedin-callback/linkedin-callback.component').then(m => m.LinkedInCallbackComponent),
    canActivate: [authGuard]
  },
  // Protected routes - require authentication
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects-page/projects-page.component').then(m => m.ProjectsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects/new',
    loadComponent: () => import('./features/projects/project-creation-wizard/project-creation-wizard.component').then(m => m.ProjectCreationWizardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./features/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/prompts',
    loadComponent: () => import('./features/prompts/prompt-list/prompt-list.component').then(m => m.PromptListComponent),
    canActivate: [authGuard]
  },
  // Wildcard route
  {
    path: '**',
    redirectTo: 'login'
  }
];
