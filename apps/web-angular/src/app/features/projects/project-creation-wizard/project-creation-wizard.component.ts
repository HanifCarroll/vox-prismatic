import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { ProjectService } from '../../../core/services/project.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SourceInputComponent } from './source-input/source-input.component';
import { ProjectSetupComponent } from './project-setup/project-setup.component';
import { AutomationPreferencesComponent } from './automation-preferences/automation-preferences.component';
import { Platform, SourceType } from '../../../core/models/project.model';

export interface ProjectCreationData {
  // Source data
  sourceType: SourceType;
  sourceFile?: File;
  sourceUrl?: string;
  sourceText?: string;
  
  // Project setup
  title: string;
  description?: string;
  targetPlatforms: Platform[];
  tags?: string[];
  
  // Automation preferences
  autoExtractInsights: boolean;
  autoGeneratePosts: boolean;
  autoSchedule: boolean;
  insightMinScore?: number;
  postsPerInsight?: number;
  scheduleSettings?: {
    timezone: string;
    optimalTimes: boolean;
    spreadOverDays: number;
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-project-creation-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    StepsModule,
    SourceInputComponent,
    ProjectSetupComponent,
    AutomationPreferencesComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-4xl mx-auto px-4">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p class="mt-2 text-gray-600">Transform your content into engaging social media posts</p>
        </div>

        <!-- Progress Steps -->
        <div class="mb-8">
          <p-steps 
            [model]="stepItems" 
            [activeIndex]="currentStep()"
            [readonly]="false"
            (activeIndexChange)="goToStep($event)"
            styleClass="mb-8"
          />
        </div>

        <!-- Step Content -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div [ngSwitch]="currentStep()">
            <!-- Step 1: Source Input -->
            <app-source-input
              *ngSwitchCase="0"
              [data]="projectData()"
              (dataChange)="updateSourceData($event)"
              (validityChange)="step1Valid.set($event)"
            />

            <!-- Step 2: Project Setup -->
            <app-project-setup
              *ngSwitchCase="1"
              [data]="projectData()"
              (dataChange)="updateProjectData($event)"
              (validityChange)="step2Valid.set($event)"
            />

            <!-- Step 3: Automation Preferences -->
            <app-automation-preferences
              *ngSwitchCase="2"
              [data]="projectData()"
              (dataChange)="updateAutomationData($event)"
            />

            <!-- Step 4: Review & Create -->
            <div *ngSwitchCase="3" class="space-y-6">
              <h2 class="text-2xl font-semibold mb-4">Review & Create</h2>
              
              <!-- Source Summary -->
              <div class="border rounded-lg p-4">
                <h3 class="font-semibold text-gray-700 mb-2">Source Content</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center space-x-2">
                    <i [class]="getSourceIcon(projectData().sourceType)"></i>
                    <span class="font-medium">{{ formatSourceType(projectData().sourceType) }}</span>
                  </div>
                  <div *ngIf="projectData().sourceFile" class="text-gray-600">
                    File: {{ projectData().sourceFile?.name }}
                  </div>
                  <div *ngIf="projectData().sourceUrl" class="text-gray-600">
                    URL: {{ projectData().sourceUrl }}
                  </div>
                  <div *ngIf="projectData().sourceText" class="text-gray-600">
                    Text: {{ projectData().sourceText?.substring(0, 100) }}...
                  </div>
                </div>
              </div>

              <!-- Project Summary -->
              <div class="border rounded-lg p-4">
                <h3 class="font-semibold text-gray-700 mb-2">Project Details</h3>
                <div class="space-y-2 text-sm">
                  <div>
                    <span class="font-medium">Title:</span> {{ projectData().title }}
                  </div>
                  <div *ngIf="projectData().description">
                    <span class="font-medium">Description:</span> {{ projectData().description }}
                  </div>
                  <div>
                    <span class="font-medium">Target Platforms:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <span
                        *ngFor="let platform of projectData().targetPlatforms"
                        class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {{ platform }}
                      </span>
                    </div>
                  </div>
                  <div *ngIf="projectData().tags && projectData().tags!.length > 0">
                    <span class="font-medium">Tags:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <span
                        *ngFor="let tag of projectData().tags"
                        class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Automation Summary -->
              <div class="border rounded-lg p-4">
                <h3 class="font-semibold text-gray-700 mb-2">Automation Settings</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center space-x-2">
                    <i class="pi" [ngClass]="projectData().autoExtractInsights ? 'pi-check-circle text-green-600' : 'pi-times-circle text-gray-400'"></i>
                    <span>Auto-extract insights after processing</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <i class="pi" [ngClass]="projectData().autoGeneratePosts ? 'pi-check-circle text-green-600' : 'pi-times-circle text-gray-400'"></i>
                    <span>Auto-generate posts from approved insights</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <i class="pi" [ngClass]="projectData().autoSchedule ? 'pi-check-circle text-green-600' : 'pi-times-circle text-gray-400'"></i>
                    <span>Auto-schedule approved posts</span>
                  </div>
                  <div *ngIf="projectData().insightMinScore" class="ml-6 text-gray-600">
                    Minimum insight score: {{ projectData().insightMinScore }}
                  </div>
                  <div *ngIf="projectData().postsPerInsight" class="ml-6 text-gray-600">
                    Posts per insight: {{ projectData().postsPerInsight }}
                  </div>
                </div>
              </div>

              <!-- Processing Notice -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start space-x-3">
                  <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
                  <div class="text-sm">
                    <p class="font-semibold text-blue-900 mb-1">What happens next?</p>
                    <ul class="space-y-1 text-blue-800">
                      <li>• Your content will be uploaded and processed</li>
                      <li>• Transcription will begin automatically (if audio/video)</li>
                      <li>• You'll be redirected to the project detail page</li>
                      <li>• Processing typically takes 2-5 minutes depending on content length</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex justify-between mt-8 pt-6 border-t">
            <div>
              <button
                pButton
                label="Cancel"
                class="p-button-text"
                (click)="cancel()"
              ></button>
            </div>
            <div class="flex space-x-3">
              <button
                pButton
                label="Previous"
                icon="pi pi-chevron-left"
                class="p-button-outlined"
                [disabled]="currentStep() === 0"
                (click)="previousStep()"
              ></button>
              <button
                *ngIf="currentStep() < 3"
                pButton
                label="Next"
                icon="pi pi-chevron-right"
                iconPos="right"
                [disabled]="!canProceed()"
                (click)="nextStep()"
              ></button>
              <button
                *ngIf="currentStep() === 3"
                pButton
                label="Create Project"
                icon="pi pi-check"
                iconPos="right"
                [loading]="creating()"
                (click)="createProject()"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ProjectCreationWizardComponent {
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private notificationService = inject(NotificationService);

  currentStep = signal(0);
  creating = signal(false);
  
  step1Valid = signal(false);
  step2Valid = signal(false);

  projectData = signal<ProjectCreationData>({
    sourceType: 'AUDIO' as SourceType,
    title: '',
    targetPlatforms: [],
    autoExtractInsights: true,
    autoGeneratePosts: false,
    autoSchedule: false
  });

  stepItems: MenuItem[] = [
    { label: 'Source Input', icon: 'pi pi-upload' },
    { label: 'Project Setup', icon: 'pi pi-cog' },
    { label: 'Automation', icon: 'pi pi-bolt' },
    { label: 'Review', icon: 'pi pi-check' }
  ];

  canProceed = computed(() => {
    switch (this.currentStep()) {
      case 0:
        return this.step1Valid();
      case 1:
        return this.step2Valid();
      case 2:
        return true; // Automation step is always valid (all optional)
      default:
        return true;
    }
  });

  updateSourceData(data: Partial<ProjectCreationData>): void {
    this.projectData.update(current => ({ ...current, ...data }));
  }

  updateProjectData(data: Partial<ProjectCreationData>): void {
    this.projectData.update(current => ({ ...current, ...data }));
  }

  updateAutomationData(data: Partial<ProjectCreationData>): void {
    this.projectData.update(current => ({ ...current, ...data }));
  }

  goToStep(index: number): void {
    // Only allow going to previous steps or the next step if current is valid
    if (index < this.currentStep() || (index === this.currentStep() + 1 && this.canProceed())) {
      this.currentStep.set(index);
    }
  }

  nextStep(): void {
    if (this.canProceed() && this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
      this.router.navigate(['/projects']);
    }
  }

  async createProject(): Promise<void> {
    this.creating.set(true);
    
    try {
      const data = this.projectData();
      const formData = new FormData();
      
      // Add basic project data
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('sourceType', data.sourceType);
      formData.append('targetPlatforms', JSON.stringify(data.targetPlatforms));
      if (data.tags) formData.append('tags', JSON.stringify(data.tags));
      
      // Add automation settings
      formData.append('autoExtractInsights', data.autoExtractInsights.toString());
      formData.append('autoGeneratePosts', data.autoGeneratePosts.toString());
      formData.append('autoSchedule', data.autoSchedule.toString());
      if (data.insightMinScore) formData.append('insightMinScore', data.insightMinScore.toString());
      if (data.postsPerInsight) formData.append('postsPerInsight', data.postsPerInsight.toString());
      if (data.scheduleSettings) formData.append('scheduleSettings', JSON.stringify(data.scheduleSettings));
      
      // Add source content
      if (data.sourceFile) {
        formData.append('sourceFile', data.sourceFile);
      } else if (data.sourceUrl) {
        formData.append('sourceUrl', data.sourceUrl);
      } else if (data.sourceText) {
        formData.append('sourceText', data.sourceText);
      }
      
      // Create project via API
      this.projectService.createProject(formData).subscribe({
        next: (project) => {
          this.notificationService.success('Project created successfully!');
          this.router.navigate(['/projects', project.id]);
        },
        error: (error) => {
          console.error('Error creating project:', error);
          this.notificationService.error('Failed to create project. Please try again.');
          this.creating.set(false);
        }
      });
    } catch (error) {
      console.error('Error preparing project data:', error);
      this.notificationService.error('Failed to prepare project data. Please try again.');
      this.creating.set(false);
    }
  }

  formatSourceType(type: SourceType): string {
    const types: Record<SourceType, string> = {
      'AUDIO': 'Audio File',
      'VIDEO': 'Video File',
      'TEXT': 'Text Content',
      'URL': 'Web URL'
    };
    return types[type] || type;
  }

  getSourceIcon(type: SourceType): string {
    const icons: Record<SourceType, string> = {
      'AUDIO': 'pi pi-volume-up text-purple-600',
      'VIDEO': 'pi pi-video text-red-600',
      'TEXT': 'pi pi-file-text text-blue-600',
      'URL': 'pi pi-link text-green-600'
    };
    return icons[type] || 'pi pi-file text-gray-600';
  }
}