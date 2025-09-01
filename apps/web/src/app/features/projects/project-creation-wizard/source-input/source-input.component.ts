import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FileUploadModule } from 'primeng/fileupload';
import { CardModule } from 'primeng/card';
import { ProjectCreationData } from '../project-creation-wizard.component';
import { SourceType } from '../../../../core/models/project.model';

@Component({
  selector: 'app-source-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RadioButtonModule,
    InputTextModule,
    InputTextareaModule,
    FileUploadModule,
    CardModule
  ],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold mb-4">Choose Your Content Source</h2>
      
      <!-- Source Type Selection -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div
          *ngFor="let type of sourceTypes"
          class="relative"
        >
          <input
            type="radio"
            [id]="'source-' + type.value"
            [value]="type.value"
            [(ngModel)]="selectedSourceType"
            (change)="onSourceTypeChange()"
            class="sr-only"
          />
          <label
            [for]="'source-' + type.value"
            class="flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all"
            [ngClass]="{
              'border-blue-500 bg-blue-50': selectedSourceType() === type.value,
              'border-gray-300 hover:border-gray-400': selectedSourceType() !== type.value
            }"
          >
            <i [class]="type.icon + ' text-3xl mb-3'"></i>
            <span class="font-semibold">{{ type.label }}</span>
            <span class="text-sm text-gray-600 text-center mt-1">{{ type.description }}</span>
          </label>
        </div>
      </div>

      <!-- Input Fields Based on Source Type -->
      <div [ngSwitch]="selectedSourceType()">
        <!-- Audio Upload -->
        <div *ngSwitchCase="'AUDIO'" class="space-y-4">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div class="text-center">
              <i class="pi pi-volume-up text-6xl text-gray-400 mb-4"></i>
              <h3 class="text-lg font-semibold mb-2">Upload Audio File</h3>
              <p class="text-sm text-gray-600 mb-4">
                Supported formats: MP3, WAV, M4A, OGG (Max size: 100MB)
              </p>
              
              <input
                type="file"
                #audioInput
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                (change)="onFileSelected($event, 'AUDIO')"
                class="hidden"
              />
              
              <div *ngIf="!selectedFile()" class="space-y-3">
                <button
                  pButton
                  label="Choose File"
                  icon="pi pi-upload"
                  (click)="audioInput.click()"
                  class="p-button-outlined"
                ></button>
                <p class="text-xs text-gray-500">or drag and drop your file here</p>
              </div>
              
              <div *ngIf="selectedFile()" class="space-y-3">
                <div class="bg-gray-100 rounded-lg p-3 inline-block">
                  <div class="flex items-center space-x-3">
                    <i class="pi pi-file-audio text-2xl text-purple-600"></i>
                    <div class="text-left">
                      <p class="font-medium">{{ selectedFile()!.name }}</p>
                      <p class="text-sm text-gray-600">{{ formatFileSize(selectedFile()!.size) }}</p>
                    </div>
                    <button
                      pButton
                      icon="pi pi-times"
                      class="p-button-text p-button-sm p-button-danger"
                      (click)="clearFile()"
                    ></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Video Upload -->
        <div *ngSwitchCase="'VIDEO'" class="space-y-4">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div class="text-center">
              <i class="pi pi-video text-6xl text-gray-400 mb-4"></i>
              <h3 class="text-lg font-semibold mb-2">Upload Video File</h3>
              <p class="text-sm text-gray-600 mb-4">
                Supported formats: MP4, MOV, AVI, WebM (Max size: 500MB)
              </p>
              
              <input
                type="file"
                #videoInput
                accept="video/*,.mp4,.mov,.avi,.webm"
                (change)="onFileSelected($event, 'VIDEO')"
                class="hidden"
              />
              
              <div *ngIf="!selectedFile()" class="space-y-3">
                <button
                  pButton
                  label="Choose File"
                  icon="pi pi-upload"
                  (click)="videoInput.click()"
                  class="p-button-outlined"
                ></button>
                <p class="text-xs text-gray-500">or drag and drop your file here</p>
              </div>
              
              <div *ngIf="selectedFile()" class="space-y-3">
                <div class="bg-gray-100 rounded-lg p-3 inline-block">
                  <div class="flex items-center space-x-3">
                    <i class="pi pi-file-video text-2xl text-red-600"></i>
                    <div class="text-left">
                      <p class="font-medium">{{ selectedFile()!.name }}</p>
                      <p class="text-sm text-gray-600">{{ formatFileSize(selectedFile()!.size) }}</p>
                    </div>
                    <button
                      pButton
                      icon="pi pi-times"
                      class="p-button-text p-button-sm p-button-danger"
                      (click)="clearFile()"
                    ></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- URL Input -->
        <div *ngSwitchCase="'URL'" class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Content URL
            </label>
            <input
              type="url"
              [(ngModel)]="url"
              (ngModelChange)="onUrlChange()"
              placeholder="https://example.com/article"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-sm text-gray-600">
              Enter a URL to an article, blog post, or video (YouTube, Vimeo, etc.)
            </p>
          </div>
          
          <!-- URL Preview (if valid) -->
          <div *ngIf="isValidUrl(url())" class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <i class="pi pi-link text-green-600 text-xl"></i>
              <div class="flex-1">
                <p class="font-medium text-sm">{{ getDomainFromUrl(url()) }}</p>
                <p class="text-xs text-gray-600 truncate">{{ url() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Text Input -->
        <div *ngSwitchCase="'TEXT'" class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Content Text
            </label>
            <textarea
              [(ngModel)]="text"
              (ngModelChange)="onTextChange()"
              placeholder="Paste or type your content here..."
              rows="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
            <div class="flex justify-between text-sm text-gray-600">
              <span>{{ wordCount() }} words</span>
              <span>{{ characterCount() }} characters</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Validation Messages -->
      <div *ngIf="!isValid() && hasInteracted()" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <div class="flex items-center space-x-2">
          <i class="pi pi-exclamation-triangle text-red-600"></i>
          <span class="text-sm text-red-700">{{ getValidationMessage() }}</span>
        </div>
      </div>

      <!-- Tips -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-900 mb-2">
          <i class="pi pi-lightbulb mr-2"></i>
          Tips for Best Results
        </h4>
        <ul class="space-y-1 text-sm text-blue-800">
          <li *ngIf="selectedSourceType() === 'AUDIO'">
            • Ensure audio is clear with minimal background noise
          </li>
          <li *ngIf="selectedSourceType() === 'VIDEO'">
            • Videos with clear speech work best for transcription
          </li>
          <li *ngIf="selectedSourceType() === 'URL'">
            • Articles with 500-5000 words produce optimal insights
          </li>
          <li *ngIf="selectedSourceType() === 'TEXT'">
            • Structure your content with clear sections for better analysis
          </li>
          <li>• Longer content (10+ minutes or 1000+ words) generates more insights</li>
          <li>• Content with clear arguments or stories works best</li>
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
export class SourceInputComponent {
  @Input() data!: ProjectCreationData;
  @Output() dataChange = new EventEmitter<Partial<ProjectCreationData>>();
  @Output() validityChange = new EventEmitter<boolean>();

  selectedSourceType = signal<SourceType>('AUDIO');
  selectedFile = signal<File | null>(null);
  url = signal('');
  text = signal('');
  hasInteracted = signal(false);

  sourceTypes = [
    {
      value: 'AUDIO' as SourceType,
      label: 'Audio',
      icon: 'pi pi-volume-up text-purple-600',
      description: 'Podcast, interview, or recording'
    },
    {
      value: 'VIDEO' as SourceType,
      label: 'Video',
      icon: 'pi pi-video text-red-600',
      description: 'YouTube, webinar, or video file'
    },
    {
      value: 'URL' as SourceType,
      label: 'Web URL',
      icon: 'pi pi-link text-green-600',
      description: 'Article, blog post, or video link'
    },
    {
      value: 'TEXT' as SourceType,
      label: 'Text',
      icon: 'pi pi-file-text text-blue-600',
      description: 'Paste or type content directly'
    }
  ];

  wordCount = computed(() => {
    const text = this.text();
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  });

  characterCount = computed(() => {
    return this.text().length;
  });

  isValid = computed(() => {
    const type = this.selectedSourceType();
    switch (type) {
      case 'AUDIO':
      case 'VIDEO':
        return this.selectedFile() !== null;
      case 'URL':
        return this.isValidUrl(this.url());
      case 'TEXT':
        return this.text().trim().length >= 100; // Minimum 100 characters
      default:
        return false;
    }
  });

  constructor() {
    // Initialize from input data
    effect(() => {
      if (this.data) {
        this.selectedSourceType.set(this.data.sourceType);
        if (this.data.sourceUrl) this.url.set(this.data.sourceUrl);
        if (this.data.sourceText) this.text.set(this.data.sourceText);
      }
    }, { allowSignalWrites: true });

    // Emit validity changes
    effect(() => {
      this.validityChange.emit(this.isValid());
    }, { allowSignalWrites: true });
  }

  onSourceTypeChange(): void {
    this.hasInteracted.set(true);
    this.clearAllInputs();
    this.dataChange.emit({
      sourceType: this.selectedSourceType(),
      sourceFile: undefined,
      sourceUrl: undefined,
      sourceText: undefined
    });
  }

  onFileSelected(event: Event, type: 'AUDIO' | 'VIDEO'): void {
    this.hasInteracted.set(true);
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file size
      const maxSize = type === 'AUDIO' ? 100 * 1024 * 1024 : 500 * 1024 * 1024; // 100MB for audio, 500MB for video
      if (file.size > maxSize) {
        alert(`File is too large. Maximum size is ${type === 'AUDIO' ? '100MB' : '500MB'}`);
        return;
      }
      
      this.selectedFile.set(file);
      this.dataChange.emit({
        sourceFile: file
      });
    }
  }

  onUrlChange(): void {
    this.hasInteracted.set(true);
    this.dataChange.emit({
      sourceUrl: this.url()
    });
  }

  onTextChange(): void {
    this.hasInteracted.set(true);
    this.dataChange.emit({
      sourceText: this.text()
    });
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.dataChange.emit({
      sourceFile: undefined
    });
  }

  clearAllInputs(): void {
    this.selectedFile.set(null);
    this.url.set('');
    this.text.set('');
  }

  isValidUrl(url: string): boolean {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getValidationMessage(): string {
    const type = this.selectedSourceType();
    switch (type) {
      case 'AUDIO':
      case 'VIDEO':
        return `Please select a ${type.toLowerCase()} file to continue`;
      case 'URL':
        return 'Please enter a valid URL (starting with http:// or https://)';
      case 'TEXT':
        return 'Please enter at least 100 characters of content';
      default:
        return 'Please provide valid input';
    }
  }
}