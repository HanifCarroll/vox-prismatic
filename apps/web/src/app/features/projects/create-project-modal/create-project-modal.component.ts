import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, CreateProjectDto } from '../../../core/services/project.service';
import { SourceType, Platform } from '../../../core/models/project.model';

@Component({
  selector: 'app-create-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">Create New Project</h2>
            <button 
              (click)="close.emit()"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i class="pi pi-times text-xl"></i>
            </button>
          </div>
        </div>
        
        <!-- Body -->
        <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <!-- Step Indicator -->
          <div class="flex items-center justify-center mb-6">
            <div class="flex items-center space-x-4">
              <div 
                class="flex items-center justify-center w-8 h-8 rounded-full"
                [class.bg-blue-600]="currentStep >= 1"
                [class.text-white]="currentStep >= 1"
                [class.bg-gray-200]="currentStep < 1"
                [class.text-gray-600]="currentStep < 1"
              >
                1
              </div>
              <div class="w-16 h-0.5 bg-gray-200">
                <div class="h-full bg-blue-600 transition-all" [style.width.%]="currentStep > 1 ? 100 : 0"></div>
              </div>
              <div 
                class="flex items-center justify-center w-8 h-8 rounded-full"
                [class.bg-blue-600]="currentStep >= 2"
                [class.text-white]="currentStep >= 2"
                [class.bg-gray-200]="currentStep < 2"
                [class.text-gray-600]="currentStep < 2"
              >
                2
              </div>
              <div class="w-16 h-0.5 bg-gray-200">
                <div class="h-full bg-blue-600 transition-all" [style.width.%]="currentStep > 2 ? 100 : 0"></div>
              </div>
              <div 
                class="flex items-center justify-center w-8 h-8 rounded-full"
                [class.bg-blue-600]="currentStep >= 3"
                [class.text-white]="currentStep >= 3"
                [class.bg-gray-200]="currentStep < 3"
                [class.text-gray-600]="currentStep < 3"
              >
                3
              </div>
            </div>
          </div>
          
          <!-- Step 1: Source Selection -->
          <div *ngIf="currentStep === 1" class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Choose Your Content Source</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <button 
                *ngFor="let source of sourceTypes"
                (click)="selectSourceType(source.type)"
                class="p-6 border-2 rounded-lg hover:border-blue-500 transition-colors"
                [class.border-blue-500]="formData.sourceType === source.type"
                [class.bg-blue-50]="formData.sourceType === source.type"
              >
                <i [class]="'text-3xl mb-2 ' + source.icon"></i>
                <h4 class="font-medium text-gray-900">{{ source.label }}</h4>
                <p class="text-sm text-gray-500 mt-1">{{ source.description }}</p>
              </button>
            </div>
            
            <!-- File Upload Area -->
            <div *ngIf="formData.sourceType === 'AUDIO' || formData.sourceType === 'VIDEO'" 
                 class="mt-6 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                 (drop)="onFileDrop($event)"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 [class.border-blue-500]="isDragging"
                 [class.bg-blue-50]="isDragging">
              <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-4"></i>
              <p class="text-gray-600 mb-2">Drag and drop your file here, or</p>
              <input 
                type="file" 
                #fileInput
                (change)="onFileSelect($event)"
                [accept]="formData.sourceType === 'AUDIO' ? 'audio/*' : 'video/*'"
                class="hidden"
              />
              <button 
                (click)="fileInput.click()"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Files
              </button>
              <p class="text-xs text-gray-500 mt-2">
                {{ formData.sourceType === 'AUDIO' ? 'MP3, WAV, M4A up to 100MB' : 'MP4, MOV, AVI up to 500MB' }}
              </p>
              
              <div *ngIf="selectedFile" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <i class="pi pi-file text-green-600 mr-2"></i>
                    <span class="text-sm text-gray-700">{{ selectedFile.name }}</span>
                    <span class="text-xs text-gray-500 ml-2">({{ formatFileSize(selectedFile.size) }})</span>
                  </div>
                  <button 
                    (click)="removeFile()"
                    class="text-red-500 hover:text-red-700"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- URL Input -->
            <div *ngIf="formData.sourceType === 'URL'" class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Content URL</label>
              <input 
                type="url"
                [(ngModel)]="formData.sourceUrl"
                placeholder="https://example.com/article"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <!-- Text Input -->
            <div *ngIf="formData.sourceType === 'TEXT'" class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Content Text</label>
              <textarea 
                [(ngModel)]="contentText"
                rows="8"
                placeholder="Paste or type your content here..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
          
          <!-- Step 2: Project Details -->
          <div *ngIf="currentStep === 2" class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Project Title <span class="text-red-500">*</span>
              </label>
              <input 
                type="text"
                [(ngModel)]="formData.title"
                placeholder="Enter a descriptive title for your project"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea 
                [(ngModel)]="formData.description"
                rows="3"
                placeholder="Brief description of the content (optional)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div class="flex items-center space-x-2">
                <input 
                  type="text"
                  [(ngModel)]="tagInput"
                  (keydown.enter)="addTag()"
                  placeholder="Add tags (press Enter)"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  (click)="addTag()"
                  class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              <div class="flex flex-wrap gap-2 mt-2" *ngIf="formData.tags && formData.tags.length > 0">
                <span 
                  *ngFor="let tag of formData.tags"
                  class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center"
                >
                  {{ tag }}
                  <button 
                    (click)="removeTag(tag)"
                    class="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Target Platforms</label>
              <div class="grid grid-cols-2 gap-3">
                <label 
                  *ngFor="let platform of platforms"
                  class="flex items-center space-x-2 cursor-pointer"
                >
                  <input 
                    type="checkbox"
                    [checked]="isPlatformSelected(platform.value)"
                    (change)="togglePlatform(platform.value)"
                    class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <i [class]="platform.icon + ' text-lg'"></i>
                  <span>{{ platform.label }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Step 3: Automation Settings -->
          <div *ngIf="currentStep === 3" class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
            
            <div class="space-y-4">
              <label class="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <div>
                  <p class="font-medium text-gray-900">Auto-approve insights</p>
                  <p class="text-sm text-gray-500">Automatically approve insights above threshold score</p>
                </div>
                <input 
                  type="checkbox"
                  [(ngModel)]="automationSettings.autoApproveInsights"
                  class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              
              <div *ngIf="automationSettings.autoApproveInsights" class="ml-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Score Threshold
                </label>
                <input 
                  type="number"
                  [(ngModel)]="automationSettings.minInsightScore"
                  min="0"
                  max="100"
                  class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <label class="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <div>
                  <p class="font-medium text-gray-900">Auto-generate posts</p>
                  <p class="text-sm text-gray-500">Generate posts immediately after insights are approved</p>
                </div>
                <input 
                  type="checkbox"
                  [(ngModel)]="automationSettings.autoGeneratePosts"
                  class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              
              <label class="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <div>
                  <p class="font-medium text-gray-900">Auto-schedule posts</p>
                  <p class="text-sm text-gray-500">Schedule approved posts automatically at optimal times</p>
                </div>
                <input 
                  type="checkbox"
                  [(ngModel)]="automationSettings.autoSchedulePosts"
                  class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
            
            <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 class="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ol class="text-sm text-blue-700 space-y-1">
                <li>1. Your content will be uploaded and processed</li>
                <li>2. AI will extract key insights from the content</li>
                <li>3. You'll review and approve the insights</li>
                <li>4. Posts will be generated for your selected platforms</li>
                <li>5. Schedule and publish your content</li>
              </ol>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <button 
              *ngIf="currentStep > 1"
              (click)="previousStep()"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <i class="pi pi-arrow-left mr-2"></i>
              Back
            </button>
            <div *ngIf="currentStep === 1" class="w-20"></div>
            
            <div class="flex items-center space-x-3">
              <button 
                (click)="close.emit()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                *ngIf="currentStep < 3"
                (click)="nextStep()"
                [disabled]="!canProceed()"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
                <i class="pi pi-arrow-right ml-2"></i>
              </button>
              <button 
                *ngIf="currentStep === 3"
                (click)="createProject()"
                [disabled]="isCreating || !isFormValid()"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                <i *ngIf="isCreating" class="pi pi-spin pi-spinner mr-2"></i>
                {{ isCreating ? 'Creating...' : 'Create Project' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CreateProjectModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() projectCreated = new EventEmitter<any>();
  
  private projectService = inject(ProjectService);
  
  currentStep = 1;
  isCreating = false;
  isDragging = false;
  selectedFile: File | null = null;
  contentText = '';
  tagInput = '';
  
  formData: CreateProjectDto = {
    title: '',
    description: '',
    tags: [],
    sourceType: '',
    sourceUrl: '',
    targetPlatforms: []
  };
  
  automationSettings = {
    autoApproveInsights: false,
    minInsightScore: 70,
    autoGeneratePosts: false,
    autoSchedulePosts: false
  };
  
  sourceTypes = [
    {
      type: 'AUDIO',
      label: 'Audio',
      icon: 'pi pi-microphone text-blue-600',
      description: 'Podcast, interview, or audio recording'
    },
    {
      type: 'VIDEO',
      label: 'Video',
      icon: 'pi pi-video text-purple-600',
      description: 'Video content, webinar, or presentation'
    },
    {
      type: 'TEXT',
      label: 'Text',
      icon: 'pi pi-file-text text-green-600',
      description: 'Article, blog post, or document'
    },
    {
      type: 'URL',
      label: 'URL',
      icon: 'pi pi-link text-orange-600',
      description: 'Web page or online content'
    }
  ];
  
  platforms = [
    { value: 'LINKEDIN', label: 'LinkedIn', icon: 'pi pi-linkedin text-blue-700' },
    { value: 'TWITTER', label: 'Twitter', icon: 'pi pi-twitter text-blue-400' },
    { value: 'THREADS', label: 'Threads', icon: 'pi pi-at text-gray-700' },
    { value: 'BLUESKY', label: 'Bluesky', icon: 'pi pi-cloud text-sky-500' }
  ];
  
  selectSourceType(type: string): void {
    this.formData.sourceType = type;
  }
  
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }
  
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }
  
  removeFile(): void {
    this.selectedFile = null;
  }
  
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }
  
  addTag(): void {
    if (this.tagInput.trim()) {
      if (!this.formData.tags) {
        this.formData.tags = [];
      }
      if (!this.formData.tags.includes(this.tagInput.trim())) {
        this.formData.tags.push(this.tagInput.trim());
      }
      this.tagInput = '';
    }
  }
  
  removeTag(tag: string): void {
    if (this.formData.tags) {
      this.formData.tags = this.formData.tags.filter(t => t !== tag);
    }
  }
  
  isPlatformSelected(platform: string): boolean {
    return this.formData.targetPlatforms?.includes(platform) || false;
  }
  
  togglePlatform(platform: string): void {
    if (!this.formData.targetPlatforms) {
      this.formData.targetPlatforms = [];
    }
    
    const index = this.formData.targetPlatforms.indexOf(platform);
    if (index > -1) {
      this.formData.targetPlatforms.splice(index, 1);
    } else {
      this.formData.targetPlatforms.push(platform);
    }
  }
  
  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        if (!this.formData.sourceType) return false;
        if (this.formData.sourceType === 'AUDIO' || this.formData.sourceType === 'VIDEO') {
          return this.selectedFile !== null;
        }
        if (this.formData.sourceType === 'URL') {
          return !!this.formData.sourceUrl;
        }
        if (this.formData.sourceType === 'TEXT') {
          return !!this.contentText;
        }
        return true;
      case 2:
        return !!this.formData.title && this.formData.targetPlatforms!.length > 0;
      default:
        return true;
    }
  }
  
  isFormValid(): boolean {
    return !!this.formData.title && 
           !!this.formData.sourceType && 
           this.formData.targetPlatforms!.length > 0;
  }
  
  nextStep(): void {
    if (this.canProceed() && this.currentStep < 3) {
      this.currentStep++;
    }
  }
  
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
  
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.close.emit();
    }
  }
  
  createProject(): void {
    if (!this.isFormValid()) return;
    
    this.isCreating = true;
    
    // Add file if selected
    if (this.selectedFile) {
      this.formData.file = this.selectedFile;
    }
    
    // Add automation settings
    this.formData.autoApprovalSettings = this.automationSettings;
    
    this.projectService.createProject(this.formData).subscribe({
      next: (project) => {
        this.projectCreated.emit(project);
        this.close.emit();
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.isCreating = false;
      }
    });
  }
}