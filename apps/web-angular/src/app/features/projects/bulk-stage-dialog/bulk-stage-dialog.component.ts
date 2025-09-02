import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentProject, ProjectStage } from '../../../core/models/project.model';

interface StageOption {
  stage: ProjectStage;
  label: string;
  description: string;
  icon: string;
  color: string;
  projectCount: number;
  canAdvance: boolean;
  requirements?: string[];
}

@Component({
  selector: 'app-bulk-stage-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">Advance Project Stage</h2>
              <p class="mt-1 text-blue-100">
                Move {{ selectedProjects.length }} project{{ selectedProjects.length > 1 ? 's' : '' }} to a new stage
              </p>
            </div>
            <button
              (click)="close.emit()"
              class="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <i class="pi pi-times text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <!-- Current Stage Summary -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-3">Selected Projects by Current Stage</h3>
            <div class="grid grid-cols-2 gap-2">
              @for (summary of stageSummary(); track summary.stage) {
                <div class="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <div class="flex items-center gap-2">
                    <span 
                      class="w-2 h-2 rounded-full"
                      [style.background-color]="getStageColor(summary.stage)"
                    ></span>
                    <span class="text-sm font-medium">{{ formatStage(summary.stage) }}</span>
                  </div>
                  <span class="text-sm text-gray-600">{{ summary.count }} project{{ summary.count > 1 ? 's' : '' }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Target Stage Selection -->
          <div class="space-y-3">
            <h3 class="font-semibold text-gray-900 mb-3">Select Target Stage</h3>
            
            @for (option of stageOptions(); track option.stage) {
              <div
                class="stage-option border-2 rounded-lg p-4 cursor-pointer transition-all"
                [class.border-blue-500]="selectedStage() === option.stage"
                [class.bg-blue-50]="selectedStage() === option.stage"
                [class.border-gray-200]="selectedStage() !== option.stage"
                [class.opacity-50]="!option.canAdvance"
                [class.cursor-not-allowed]="!option.canAdvance"
                (click)="option.canAdvance && selectStage(option.stage)"
              >
                <div class="flex items-start gap-3">
                  <div 
                    class="mt-1 w-10 h-10 rounded-lg flex items-center justify-center"
                    [style.background-color]="option.color + '20'"
                  >
                    <i [class]="option.icon" [style.color]="option.color"></i>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="font-medium text-gray-900">{{ option.label }}</h4>
                      @if (option.projectCount > 0) {
                        <span class="text-xs text-gray-500">
                          {{ option.projectCount }} already here
                        </span>
                      }
                    </div>
                    <p class="text-sm text-gray-600 mt-1">{{ option.description }}</p>
                    
                    @if (option.requirements && option.requirements.length > 0) {
                      <div class="mt-2 space-y-1">
                        @for (req of option.requirements; track req) {
                          <div class="flex items-center gap-2 text-xs text-gray-500">
                            <i class="pi pi-check-circle text-green-500"></i>
                            <span>{{ req }}</span>
                          </div>
                        }
                      </div>
                    }

                    @if (!option.canAdvance) {
                      <div class="mt-2 flex items-center gap-2 text-xs text-orange-600">
                        <i class="pi pi-info-circle"></i>
                        <span>Some projects cannot be moved to this stage from their current position</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Preview Section -->
          @if (selectedStage()) {
            <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 class="font-medium text-blue-900 mb-2">Preview Changes</h4>
              <div class="space-y-2">
                @for (preview of getPreviewChanges(); track preview.project.id) {
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-700">{{ preview.project.title }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-gray-500">{{ formatStage(preview.from) }}</span>
                      <i class="pi pi-arrow-right text-gray-400"></i>
                      <span class="font-medium text-blue-700">{{ formatStage(preview.to) }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Warning for mixed stages -->
          @if (stageSummary().length > 1) {
            <div class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div class="flex items-start gap-2">
                <i class="pi pi-exclamation-triangle text-yellow-600 mt-0.5"></i>
                <div class="text-sm text-yellow-800">
                  <p class="font-medium">Mixed stages detected</p>
                  <p class="mt-1">The selected projects are currently in different stages. They will all be moved to the same target stage.</p>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-200 p-6 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-600">
              {{ validProjectsCount() }} of {{ selectedProjects.length }} projects will be updated
            </div>
            <div class="flex items-center gap-3">
              <button
                (click)="close.emit()"
                class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="confirmAdvance()"
                [disabled]="!selectedStage() || validProjectsCount() === 0"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i class="pi pi-check mr-2"></i>
                Advance {{ validProjectsCount() }} Project{{ validProjectsCount() !== 1 ? 's' : '' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stage-option:hover:not(.cursor-not-allowed) {
      @apply shadow-md;
    }
  `]
})
export class BulkStageDialogComponent {
  @Input() selectedProjects: ContentProject[] = [];
  @Input() allProjects: ContentProject[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ projects: ContentProject[]; targetStage: ProjectStage }>();

  selectedStage = signal<ProjectStage | null>(null);

  private stageOrder: ProjectStage[] = [
    ProjectStage.RAW_CONTENT,
    ProjectStage.PROCESSING_CONTENT,
    ProjectStage.INSIGHTS_READY,
    ProjectStage.INSIGHTS_APPROVED,
    ProjectStage.POSTS_GENERATED,
    ProjectStage.POSTS_APPROVED,
    ProjectStage.SCHEDULED,
    ProjectStage.PUBLISHING,
    ProjectStage.PUBLISHED,
    ProjectStage.ARCHIVED
  ];

  private stageDescriptions: Record<ProjectStage, { label: string; description: string; icon: string; color: string; requirements?: string[] }> = {
    [ProjectStage.RAW_CONTENT]: {
      label: 'Raw Content',
      description: 'Initial content upload or import stage',
      icon: 'pi pi-file',
      color: '#6b7280'
    },
    [ProjectStage.PROCESSING_CONTENT]: {
      label: 'Processing Content',
      description: 'Content is being transcribed and processed',
      icon: 'pi pi-cog',
      color: '#3b82f6',
      requirements: ['Content uploaded', 'Processing initiated']
    },
    [ProjectStage.INSIGHTS_READY]: {
      label: 'Insights Ready',
      description: 'AI-generated insights are ready for review',
      icon: 'pi pi-lightbulb',
      color: '#8b5cf6',
      requirements: ['Content processed', 'Insights extracted']
    },
    [ProjectStage.INSIGHTS_APPROVED]: {
      label: 'Insights Approved',
      description: 'Insights have been reviewed and approved',
      icon: 'pi pi-check-circle',
      color: '#10b981',
      requirements: ['Insights reviewed', 'Quality verified']
    },
    [ProjectStage.POSTS_GENERATED]: {
      label: 'Posts Generated',
      description: 'Social media posts have been created from insights',
      icon: 'pi pi-file-edit',
      color: '#6366f1',
      requirements: ['Insights approved', 'Posts generated']
    },
    [ProjectStage.POSTS_APPROVED]: {
      label: 'Posts Approved',
      description: 'Posts are finalized and ready for scheduling',
      icon: 'pi pi-verified',
      color: '#14b8a6',
      requirements: ['Posts reviewed', 'Content approved']
    },
    [ProjectStage.SCHEDULED]: {
      label: 'Scheduled',
      description: 'Posts are scheduled for publishing',
      icon: 'pi pi-calendar',
      color: '#f59e0b',
      requirements: ['Publishing times set', 'Platforms configured']
    },
    [ProjectStage.PUBLISHING]: {
      label: 'Publishing',
      description: 'Posts are being published to social platforms',
      icon: 'pi pi-send',
      color: '#ef4444'
    },
    [ProjectStage.PUBLISHED]: {
      label: 'Published',
      description: 'All posts have been successfully published',
      icon: 'pi pi-globe',
      color: '#22c55e'
    },
    [ProjectStage.ARCHIVED]: {
      label: 'Archived',
      description: 'Project is completed and archived',
      icon: 'pi pi-box',
      color: '#94a3b8'
    }
  };

  stageSummary = computed(() => {
    const summary = new Map<ProjectStage, number>();
    this.selectedProjects.forEach(project => {
      summary.set(project.currentStage, (summary.get(project.currentStage) || 0) + 1);
    });
    return Array.from(summary.entries()).map(([stage, count]) => ({ stage, count }));
  });

  stageOptions = computed<StageOption[]>(() => {
    return this.stageOrder.map(stage => {
      const config = this.stageDescriptions[stage];
      const projectsInStage = this.allProjects.filter(p => p.currentStage === stage).length;
      
      const canAdvance = this.selectedProjects.some(project => {
        const currentIndex = this.stageOrder.indexOf(project.currentStage);
        const targetIndex = this.stageOrder.indexOf(stage);
        return targetIndex > currentIndex || stage === ProjectStage.ARCHIVED;
      });

      return {
        stage,
        ...config,
        projectCount: projectsInStage,
        canAdvance
      };
    });
  });

  validProjectsCount = computed(() => {
    if (!this.selectedStage()) return 0;
    
    return this.selectedProjects.filter(project => {
      const currentIndex = this.stageOrder.indexOf(project.currentStage);
      const targetIndex = this.stageOrder.indexOf(this.selectedStage()!);
      return targetIndex > currentIndex || this.selectedStage() === ProjectStage.ARCHIVED;
    }).length;
  });

  selectStage(stage: ProjectStage) {
    this.selectedStage.set(stage);
  }

  getPreviewChanges() {
    if (!this.selectedStage()) return [];
    
    return this.selectedProjects
      .filter(project => {
        const currentIndex = this.stageOrder.indexOf(project.currentStage);
        const targetIndex = this.stageOrder.indexOf(this.selectedStage()!);
        return targetIndex > currentIndex || this.selectedStage() === ProjectStage.ARCHIVED;
      })
      .map(project => ({
        project,
        from: project.currentStage,
        to: this.selectedStage()!
      }));
  }

  formatStage(stage: ProjectStage): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getStageColor(stage: ProjectStage): string {
    return this.stageDescriptions[stage]?.color || '#6b7280';
  }

  confirmAdvance() {
    if (!this.selectedStage() || this.validProjectsCount() === 0) return;
    
    const validProjects = this.selectedProjects.filter(project => {
      const currentIndex = this.stageOrder.indexOf(project.currentStage);
      const targetIndex = this.stageOrder.indexOf(this.selectedStage()!);
      return targetIndex > currentIndex || this.selectedStage() === ProjectStage.ARCHIVED;
    });

    this.confirm.emit({
      projects: validProjects,
      targetStage: this.selectedStage()!
    });
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}