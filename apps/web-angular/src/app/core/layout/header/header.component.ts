import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
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
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class HeaderComponent {
  private projectService = inject(ProjectService);
  currentProject$ = this.projectService.currentProject$;
  
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
}