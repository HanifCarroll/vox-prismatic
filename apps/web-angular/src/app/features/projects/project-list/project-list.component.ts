import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjectFilter } from '../../../core/services/project.service';
import { ContentProject, ProjectStage } from '../../../core/models/project.model';
import { ProjectCardComponent } from '../project-card/project-card.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProjectCardComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
        <button 
          routerLink="/projects/new"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <i class="pi pi-plus mr-2"></i>
          New Project
        </button>
      </div>
      
      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <input
              type="text"
              [(ngModel)]="filter.searchTerm"
              (ngModelChange)="applyFilter()"
              placeholder="Search projects..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            [(ngModel)]="filter.stage"
            (ngModelChange)="applyFilter()"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stages</option>
            <option *ngFor="let stage of stages" [value]="stage">
              {{ formatStage(stage) }}
            </option>
          </select>
          
          <div class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">View:</label>
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button
                (click)="viewMode = 'cards'"
                [class.bg-white]="viewMode === 'cards'"
                [class.shadow]="viewMode === 'cards'"
                class="px-3 py-1 rounded transition-all"
              >
                <i class="pi pi-th-large"></i>
              </button>
              <button
                (click)="viewMode = 'list'"
                [class.bg-white]="viewMode === 'list'"
                [class.shadow]="viewMode === 'list'"
                class="px-3 py-1 rounded transition-all"
              >
                <i class="pi pi-list"></i>
              </button>
              <button
                (click)="viewMode = 'kanban'"
                [class.bg-white]="viewMode === 'kanban'"
                [class.shadow]="viewMode === 'kanban'"
                class="px-3 py-1 rounded transition-all"
              >
                <i class="pi pi-table"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Projects Grid View -->
      <div *ngIf="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <app-project-card
          *ngFor="let project of filteredProjects"
          [project]="project"
          (click)="selectProject(project)"
        />
      </div>
      
      <!-- Projects List View -->
      <div *ngIf="viewMode === 'list'" class="bg-white rounded-lg shadow">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stage
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr 
              *ngFor="let project of filteredProjects"
              class="hover:bg-gray-50 cursor-pointer"
              (click)="selectProject(project)"
            >
              <td class="px-6 py-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ project.title }}</div>
                  <div class="text-sm text-gray-500">{{ project.description }}</div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2 py-1 text-xs rounded-full"
                  [ngClass]="getStageClass(project.currentStage)"
                >
                  {{ formatStage(project.currentStage) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full"
                      [style.width.%]="project.overallProgress"
                    ></div>
                  </div>
                  <span class="text-sm text-gray-600">{{ project.overallProgress }}%</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(project.updatedAt) }}
              </td>
              <td class="px-6 py-4">
                <button 
                  (click)="$event.stopPropagation()"
                  class="text-blue-600 hover:text-blue-800"
                >
                  <i class="pi pi-ellipsis-v"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Kanban View -->
      <div *ngIf="viewMode === 'kanban'" class="flex space-x-4 overflow-x-auto pb-4">
        <div 
          *ngFor="let stage of activeStages"
          class="flex-shrink-0 w-80"
        >
          <div class="bg-gray-100 rounded-lg p-4">
            <h3 class="font-semibold text-gray-700 mb-3">
              {{ formatStage(stage) }}
              <span class="ml-2 text-sm text-gray-500">
                ({{ getProjectsByStage(stage).length }})
              </span>
            </h3>
            <div class="space-y-3">
              <div
                *ngFor="let project of getProjectsByStage(stage)"
                class="bg-white rounded-lg p-4 shadow cursor-pointer hover:shadow-md transition-shadow"
                (click)="selectProject(project)"
              >
                <h4 class="font-medium text-gray-900">{{ project.title }}</h4>
                <p class="text-sm text-gray-500 mt-1">{{ project.description }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <div class="text-xs text-gray-500">
                    {{ formatDate(project.updatedAt) }}
                  </div>
                  <div class="text-sm font-medium text-blue-600">
                    {{ project.overallProgress }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="filteredProjects.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
        <i class="pi pi-folder-open text-6xl text-gray-300"></i>
        <h3 class="mt-4 text-xl font-medium text-gray-900">No projects found</h3>
        <p class="mt-2 text-gray-500">
          {{ filter.searchTerm || filter.stage ? 'Try adjusting your filters' : 'Create your first project to get started' }}
        </p>
        <button 
          *ngIf="!filter.searchTerm && !filter.stage"
          routerLink="/projects/new"
          class="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Project
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);
  
  projects: ContentProject[] = [];
  filteredProjects: ContentProject[] = [];
  filter: ProjectFilter = {};
  viewMode: 'cards' | 'list' | 'kanban' = 'cards';
  stages = Object.values(ProjectStage);
  activeStages = Object.values(ProjectStage).filter(
    s => s !== ProjectStage.ARCHIVED && s !== ProjectStage.PUBLISHED
  );
  
  ngOnInit(): void {
    this.loadProjects();
  }
  
  loadProjects(): void {
    this.projectService.getProjects(this.filter).subscribe(projects => {
      this.projects = projects;
      this.applyFilter();
    });
  }
  
  applyFilter(): void {
    this.filteredProjects = this.projects.filter(project => {
      if (this.filter.searchTerm) {
        const search = this.filter.searchTerm.toLowerCase();
        if (!project.title.toLowerCase().includes(search) && 
            !project.description?.toLowerCase().includes(search)) {
          return false;
        }
      }
      
      if (this.filter.stage && project.currentStage !== this.filter.stage) {
        return false;
      }
      
      return true;
    });
  }
  
  getProjectsByStage(stage: ProjectStage): ContentProject[] {
    return this.filteredProjects.filter(p => p.currentStage === stage);
  }
  
  selectProject(project: ContentProject): void {
    this.projectService.setCurrentProject(project);
    // Navigate to project detail
    window.location.href = `/projects/${project.id}`;
  }
  
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
  
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString();
  }
}