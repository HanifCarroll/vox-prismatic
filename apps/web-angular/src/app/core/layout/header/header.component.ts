import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthStore } from '../../stores/auth.store';
import { AuthService } from '../../services/auth.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <ng-container *ngIf="currentProject$ | async as project">
              <span class="text-sm text-gray-500">Current Project:</span>
              <h2 class="text-lg font-semibold text-gray-800">{{ project.title }}</h2>
              <span 
                class="px-2 py-1 text-xs rounded-full"
                [ngClass]="getStageClass(project.currentStage)"
              >
                {{ formatStage(project.currentStage) }}
              </span>
            </ng-container>
            <div *ngIf="!(currentProject$ | async)" class="text-gray-500">
              Select a project to get started
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <button class="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <i class="pi pi-bell text-xl"></i>
            </button>
            <button class="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <i class="pi pi-question-circle text-xl"></i>
            </button>
            
            @if (authStore.user(); as user) {
              <div class="relative">
                <button 
                  (click)="toggleUserMenu()"
                  class="flex items-center space-x-3 text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {{ getUserInitials(user) }}
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-700">{{ authStore.getUserDisplayName() }}</div>
                    <div class="text-gray-500">{{ user.email }}</div>
                  </div>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                @if (showUserMenu()) {
                  <div class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div class="py-1">
                      <div class="px-4 py-3 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-700">{{ authStore.getUserDisplayName() }}</p>
                        <p class="text-sm text-gray-500">{{ user.email }}</p>
                        @if (!user.emailVerified) {
                          <p class="text-xs text-orange-600 mt-1">Email not verified</p>
                        }
                      </div>
                      
                      <a 
                        routerLink="/settings"
                        (click)="closeUserMenu()"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </a>
                      
                      <a 
                        routerLink="/settings/prompts"
                        (click)="closeUserMenu()"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Prompt Templates
                      </a>
                      
                      <div class="border-t border-gray-100 mt-1">
                        <button 
                          (click)="logout()"
                          class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class HeaderComponent {
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  readonly authStore = inject(AuthStore);
  
  currentProject$ = this.projectService.currentProject$;
  readonly showUserMenu = signal(false);
  
  getStageClass(stage: string): string {
    const stageClasses: Record<string, string> = {
      'RAW_CONTENT': 'bg-gray-100 text-gray-700',
      'PROCESSING_CONTENT': 'bg-yellow-100 text-yellow-700',
      'INSIGHTS_READY': 'bg-purple-100 text-purple-700',
      'INSIGHTS_APPROVED': 'bg-indigo-100 text-indigo-700',
      'POSTS_GENERATED': 'bg-blue-100 text-blue-700',
      'POSTS_APPROVED': 'bg-teal-100 text-teal-700',
      'SCHEDULED': 'bg-orange-100 text-orange-700',
      'PUBLISHING': 'bg-pink-100 text-pink-700',
      'PUBLISHED': 'bg-green-100 text-green-700',
      'ARCHIVED': 'bg-gray-100 text-gray-500'
    };
    return stageClasses[stage] || 'bg-gray-100 text-gray-700';
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Auth-related methods
  getUserInitials(user: any): string {
    const firstName = user.firstName?.[0] || '';
    const lastName = user.lastName?.[0] || '';
    
    if (firstName && lastName) {
      return (firstName + lastName).toUpperCase();
    }
    
    if (firstName) {
      return firstName.toUpperCase();
    }
    
    return user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(current => !current);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
      },
      error: (error) => {
        console.error('Logout error:', error);
      }
    });
  }
}