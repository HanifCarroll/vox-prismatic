import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="w-64 bg-white shadow-md flex flex-col">
      <div class="p-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-800">Content Hub</h1>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <ul class="py-4">
          <li *ngFor="let item of navItems">
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-blue-50 text-blue-600 border-l-4 border-blue-600"
              class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors duration-200"
            >
              <div class="flex items-center">
                <i [class]="'pi ' + item.icon + ' mr-3 text-lg'"></i>
                <span class="font-medium">{{ item.label }}</span>
              </div>
              <span 
                *ngIf="item.badge && item.badge > 0"
                class="bg-red-500 text-white text-xs rounded-full px-2 py-1"
              >
                {{ item.badge }}
              </span>
            </a>
          </li>
        </ul>
      </div>
      
      <div class="p-4 border-t border-gray-200">
        <button
          (click)="createNewProject()"
          class="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
        >
          <i class="pi pi-plus mr-2"></i>
          New Project
        </button>
      </div>
    </nav>
  `,
  styles: []
})
export class SidebarComponent {
  private router = inject(Router);
  private projectService = inject(ProjectService);
  
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi-home',
      route: '/dashboard'
    },
    {
      label: 'Projects',
      icon: 'pi-folder',
      route: '/projects',
      badge: 0
    },
    {
      label: 'Calendar',
      icon: 'pi-calendar',
      route: '/calendar',
      badge: 0
    },
    {
      label: 'Settings',
      icon: 'pi-cog',
      route: '/settings'
    }
  ];
  
  createNewProject(): void {
    this.router.navigate(['/projects', 'new']);
  }
}