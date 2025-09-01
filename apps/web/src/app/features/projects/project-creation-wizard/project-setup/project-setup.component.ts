import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ChipsModule } from 'primeng/chips';
import { CheckboxModule } from 'primeng/checkbox';
import { ProjectCreationData } from '../project-creation-wizard.component';
import { Platform } from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    ChipsModule,
    CheckboxModule
  ],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold mb-4">Project Details</h2>
      
      <!-- Title -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Project Title <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          [(ngModel)]="title"
          (ngModelChange)="onTitleChange()"
          placeholder="Enter a descriptive title for your project"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          [class.border-red-500]="!title() && hasInteracted()"
        />
        <p class="text-sm text-gray-600">
          This will help you identify the project later
        </p>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          [(ngModel)]="description"
          (ngModelChange)="onDescriptionChange()"
          placeholder="Add notes about this content (optional)"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        ></textarea>
      </div>

      <!-- Target Platforms -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Target Platforms <span class="text-red-500">*</span>
        </label>
        <p class="text-sm text-gray-600 mb-3">
          Select where you want to publish your content
        </p>
        
        <div class="grid grid-cols-2 gap-4">
          <div
            *ngFor="let platform of availablePlatforms"
            class="relative"
          >
            <input
              type="checkbox"
              [id]="'platform-' + platform.value"
              [checked]="selectedPlatforms().includes(platform.value)"
              (change)="togglePlatform(platform.value)"
              class="sr-only"
            />
            <label
              [for]="'platform-' + platform.value"
              class="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all"
              [ngClass]="{
                'border-blue-500 bg-blue-50': selectedPlatforms().includes(platform.value),
                'border-gray-300 hover:border-gray-400': !selectedPlatforms().includes(platform.value)
              }"
            >
              <i [class]="platform.icon + ' text-2xl'"></i>
              <div>
                <p class="font-medium">{{ platform.label }}</p>
                <p class="text-xs text-gray-600">{{ platform.description }}</p>
              </div>
              <i
                *ngIf="selectedPlatforms().includes(platform.value)"
                class="pi pi-check-circle text-blue-600 ml-auto"
              ></i>
            </label>
          </div>
        </div>
        
        <div *ngIf="selectedPlatforms().length === 0 && hasInteracted()" 
             class="text-sm text-red-600">
          Please select at least one platform
        </div>
      </div>

      <!-- Tags -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Tags
        </label>
        <div class="relative">
          <input
            type="text"
            [(ngModel)]="tagInput"
            (keydown.enter)="addTag($event)"
            placeholder="Add tags and press Enter"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div *ngIf="tags().length > 0" class="flex flex-wrap gap-2 mt-2">
          <span
            *ngFor="let tag of tags()"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
          >
            {{ tag }}
            <button
              (click)="removeTag(tag)"
              class="ml-2 text-gray-500 hover:text-gray-700"
            >
              <i class="pi pi-times text-xs"></i>
            </button>
          </span>
        </div>
        <p class="text-sm text-gray-600">
          Tags help organize and search your projects
        </p>
      </div>

      <!-- Validation Summary -->
      <div *ngIf="!isValid() && hasInteracted()" 
           class="bg-red-50 border border-red-200 rounded-lg p-3">
        <div class="flex items-start space-x-2">
          <i class="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
          <div class="text-sm text-red-700">
            <p class="font-medium mb-1">Please complete the following:</p>
            <ul class="space-y-1 ml-4">
              <li *ngIf="!title()">• Enter a project title</li>
              <li *ngIf="selectedPlatforms().length === 0">• Select at least one target platform</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Platform-Specific Tips -->
      <div *ngIf="selectedPlatforms().length > 0" 
           class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-900 mb-2">
          <i class="pi pi-info-circle mr-2"></i>
          Platform Considerations
        </h4>
        <ul class="space-y-1 text-sm text-blue-800">
          <li *ngIf="selectedPlatforms().includes('LINKEDIN')">
            • LinkedIn: Professional tone, 1300 character limit, best for B2B content
          </li>
          <li *ngIf="selectedPlatforms().includes('TWITTER')">
            • Twitter/X: Concise messages, 280 characters, use threads for longer content
          </li>
          <li *ngIf="selectedPlatforms().includes('THREADS')">
            • Threads: Conversational tone, 500 character limit, visual content performs well
          </li>
          <li *ngIf="selectedPlatforms().includes('BLUESKY')">
            • Bluesky: Similar to Twitter, 300 character limit, growing professional audience
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ProjectSetupComponent {
  @Input() data!: ProjectCreationData;
  @Output() dataChange = new EventEmitter<Partial<ProjectCreationData>>();
  @Output() validityChange = new EventEmitter<boolean>();

  title = signal('');
  description = signal('');
  selectedPlatforms = signal<Platform[]>([]);
  tags = signal<string[]>([]);
  tagInput = signal('');
  hasInteracted = signal(false);

  availablePlatforms = [
    {
      value: 'LINKEDIN' as Platform,
      label: 'LinkedIn',
      icon: 'pi pi-linkedin text-blue-700',
      description: 'Professional networking'
    },
    {
      value: 'TWITTER' as Platform,
      label: 'Twitter/X',
      icon: 'pi pi-twitter text-blue-400',
      description: 'Real-time conversations'
    },
    {
      value: 'THREADS' as Platform,
      label: 'Threads',
      icon: 'pi pi-at text-gray-700',
      description: 'Instagram\'s text platform'
    },
    {
      value: 'BLUESKY' as Platform,
      label: 'Bluesky',
      icon: 'pi pi-cloud text-sky-500',
      description: 'Decentralized social'
    }
  ];

  isValid = computed(() => {
    return this.title().trim().length > 0 && this.selectedPlatforms().length > 0;
  });

  constructor() {
    // Initialize from input data
    effect(() => {
      if (this.data) {
        if (this.data.title) this.title.set(this.data.title);
        if (this.data.description) this.description.set(this.data.description);
        if (this.data.targetPlatforms) this.selectedPlatforms.set(this.data.targetPlatforms);
        if (this.data.tags) this.tags.set(this.data.tags);
      }
    }, { allowSignalWrites: true });

    // Emit validity changes
    effect(() => {
      this.validityChange.emit(this.isValid());
    }, { allowSignalWrites: true });
  }

  onTitleChange(): void {
    this.hasInteracted.set(true);
    this.dataChange.emit({
      title: this.title()
    });
  }

  onDescriptionChange(): void {
    this.dataChange.emit({
      description: this.description()
    });
  }

  togglePlatform(platform: Platform): void {
    this.hasInteracted.set(true);
    const current = this.selectedPlatforms();
    const index = current.indexOf(platform);
    
    if (index >= 0) {
      // Remove platform
      this.selectedPlatforms.set(current.filter(p => p !== platform));
    } else {
      // Add platform
      this.selectedPlatforms.set([...current, platform]);
    }
    
    this.dataChange.emit({
      targetPlatforms: this.selectedPlatforms()
    });
  }

  addTag(event: Event): void {
    event.preventDefault();
    const tag = this.tagInput().trim();
    
    if (tag && !this.tags().includes(tag)) {
      this.tags.update(tags => [...tags, tag]);
      this.tagInput.set('');
      
      this.dataChange.emit({
        tags: this.tags()
      });
    }
  }

  removeTag(tag: string): void {
    this.tags.update(tags => tags.filter(t => t !== tag));
    
    this.dataChange.emit({
      tags: this.tags()
    });
  }
}