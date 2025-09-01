import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transcript } from '../../../core/models/project.model';
import { ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-transcript-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-800">Transcript Content</h2>
            <div class="flex items-center space-x-4 mt-2" *ngIf="transcript">
              <span class="text-sm text-gray-600">
                <i class="pi pi-file-text mr-1"></i>
                {{ transcript.wordCount }} words
              </span>
              <span class="text-sm text-gray-600" *ngIf="transcript.duration">
                <i class="pi pi-clock mr-1"></i>
                {{ formatDuration(transcript.duration) }}
              </span>
              <span class="text-sm text-gray-600" *ngIf="transcript.speakerLabels?.length">
                <i class="pi pi-users mr-1"></i>
                {{ transcript.speakerLabels.length }} speakers
              </span>
              <span 
                class="px-2 py-1 text-xs rounded-full"
                [ngClass]="getStatusClass(transcript.status)"
              >
                {{ formatStatus(transcript.status) }}
              </span>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              *ngIf="!isEditing"
              (click)="startEditing()"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-pencil mr-1"></i>
              Edit
            </button>
            <button
              *ngIf="isEditing"
              (click)="saveChanges()"
              [disabled]="!hasChanges"
              class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="pi pi-check mr-1"></i>
              Save
            </button>
            <button
              *ngIf="isEditing"
              (click)="cancelEditing()"
              class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <i class="pi pi-times mr-1"></i>
              Cancel
            </button>
            <button
              (click)="toggleView()"
              class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <i class="pi" [ngClass]="showCleaned ? 'pi-eye' : 'pi-eye-slash'"></i>
              {{ showCleaned ? 'Show Original' : 'Show Cleaned' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <div *ngIf="!transcript" class="text-center py-12 text-gray-500">
          <i class="pi pi-file-text text-4xl mb-3"></i>
          <p class="text-lg">No transcript available</p>
          <p class="text-sm mt-2">Upload or process content to generate a transcript</p>
        </div>
        
        <div *ngIf="transcript" class="space-y-4">
          <!-- Processing Status -->
          <div 
            *ngIf="transcript.status === 'processing'"
            class="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div class="flex items-center space-x-3">
              <i class="pi pi-spin pi-spinner text-blue-600 text-xl"></i>
              <div>
                <p class="text-sm font-medium text-blue-900">Processing transcript...</p>
                <p class="text-xs text-blue-700">This may take a few minutes</p>
              </div>
            </div>
          </div>
          
          <!-- Error Status -->
          <div 
            *ngIf="transcript.status === 'failed'"
            class="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div class="flex items-center space-x-3">
              <i class="pi pi-exclamation-triangle text-red-600 text-xl"></i>
              <div>
                <p class="text-sm font-medium text-red-900">Processing failed</p>
                <p class="text-xs text-red-700">Please try again or contact support</p>
              </div>
            </div>
          </div>
          
          <!-- Transcript Content -->
          <div class="relative">
            <!-- View Mode -->
            <div *ngIf="!isEditing" class="transcript-content">
              <div 
                class="prose prose-sm max-w-none"
                [innerHTML]="formatTranscriptContent(getCurrentContent())"
              ></div>
            </div>
            
            <!-- Edit Mode -->
            <div *ngIf="isEditing" class="space-y-4">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p class="text-sm text-yellow-800">
                  <i class="pi pi-info-circle mr-1"></i>
                  You are editing the {{ showCleaned ? 'cleaned' : 'original' }} transcript. 
                  Changes will be saved to this version only.
                </p>
              </div>
              <textarea
                [(ngModel)]="editContent"
                (ngModelChange)="onContentChange()"
                class="w-full min-h-[600px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter transcript content..."
              ></textarea>
              <div class="flex items-center justify-between text-sm text-gray-600">
                <span>{{ getWordCount(editContent) }} words</span>
                <span *ngIf="hasChanges" class="text-orange-600">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  Unsaved changes
                </span>
              </div>
            </div>
          </div>
          
          <!-- Speaker Labels -->
          <div *ngIf="transcript.speakerLabels?.length && !isEditing" class="mt-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Speakers Identified</h3>
            <div class="flex flex-wrap gap-2">
              <span 
                *ngFor="let speaker of transcript.speakerLabels"
                class="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                {{ speaker }}
              </span>
            </div>
          </div>
          
          <!-- Actions -->
          <div *ngIf="!isEditing" class="flex items-center justify-between mt-6 pt-6 border-t">
            <div class="flex items-center space-x-4">
              <button
                (click)="exportTranscript('txt')"
                class="text-sm text-gray-600 hover:text-gray-800"
              >
                <i class="pi pi-download mr-1"></i>
                Export as TXT
              </button>
              <button
                (click)="exportTranscript('pdf')"
                class="text-sm text-gray-600 hover:text-gray-800"
              >
                <i class="pi pi-file-pdf mr-1"></i>
                Export as PDF
              </button>
              <button
                (click)="copyToClipboard()"
                class="text-sm text-gray-600 hover:text-gray-800"
              >
                <i class="pi pi-copy mr-1"></i>
                Copy to Clipboard
              </button>
            </div>
            <div class="text-xs text-gray-500">
              Last updated: {{ formatDate(transcript.updatedAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .transcript-content {
      font-family: 'Inter', sans-serif;
      line-height: 1.8;
      color: #374151;
    }
    
    .prose {
      max-width: none;
    }
    
    .prose p {
      margin-bottom: 1rem;
    }
    
    .prose strong {
      font-weight: 600;
      color: #111827;
    }
    
    textarea {
      font-family: 'Inter', sans-serif;
      resize: vertical;
    }
  `]
})
export class TranscriptViewerComponent {
  @Input() transcript: Transcript | undefined;
  @Input() projectId!: string;
  @Output() transcriptUpdated = new EventEmitter<Transcript>();
  
  private projectService = inject(ProjectService);
  
  isEditing = false;
  showCleaned = true;
  editContent = '';
  originalContent = '';
  hasChanges = false;
  
  ngOnChanges(): void {
    if (this.transcript) {
      this.showCleaned = !!this.transcript.cleanedContent;
    }
  }
  
  getCurrentContent(): string {
    if (!this.transcript) return '';
    return this.showCleaned && this.transcript.cleanedContent 
      ? this.transcript.cleanedContent 
      : this.transcript.content;
  }
  
  startEditing(): void {
    this.isEditing = true;
    this.editContent = this.getCurrentContent();
    this.originalContent = this.editContent;
    this.hasChanges = false;
  }
  
  cancelEditing(): void {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    this.isEditing = false;
    this.editContent = '';
    this.originalContent = '';
    this.hasChanges = false;
  }
  
  saveChanges(): void {
    if (!this.transcript || !this.hasChanges) return;
    
    const updateData = this.showCleaned 
      ? { cleanedContent: this.editContent }
      : { content: this.editContent };
    
    this.projectService.updateTranscript(this.projectId, this.transcript.id, updateData)
      .subscribe({
        next: (updatedTranscript) => {
          this.transcript = updatedTranscript;
          this.transcriptUpdated.emit(updatedTranscript);
          this.isEditing = false;
          this.hasChanges = false;
          this.originalContent = '';
        },
        error: (error) => {
          console.error('Error saving transcript:', error);
          alert('Failed to save changes. Please try again.');
        }
      });
  }
  
  onContentChange(): void {
    this.hasChanges = this.editContent !== this.originalContent;
  }
  
  toggleView(): void {
    if (this.transcript?.cleanedContent) {
      this.showCleaned = !this.showCleaned;
      if (this.isEditing) {
        this.editContent = this.getCurrentContent();
        this.originalContent = this.editContent;
        this.hasChanges = false;
      }
    }
  }
  
  formatTranscriptContent(content: string): string {
    if (!content) return '';
    
    // Convert line breaks to paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    // Format each paragraph
    return paragraphs.map(paragraph => {
      // Check if it's a speaker label
      if (paragraph.match(/^[A-Z\s]+:/)) {
        const [speaker, ...text] = paragraph.split(':');
        return `<p><strong>${speaker}:</strong>${text.join(':')}</p>`;
      }
      return `<p>${paragraph}</p>`;
    }).join('');
  }
  
  getWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  exportTranscript(format: 'txt' | 'pdf'): void {
    if (!this.transcript) return;
    
    const content = this.getCurrentContent();
    const filename = `transcript-${this.projectId}-${new Date().getTime()}`;
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // TODO: Implement PDF export
      console.log('PDF export not yet implemented');
    }
  }
  
  copyToClipboard(): void {
    if (!this.transcript) return;
    
    const content = this.getCurrentContent();
    navigator.clipboard.writeText(content).then(() => {
      // TODO: Show success notification
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }
  
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  }
  
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString();
  }
  
  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'processing': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
      'failed': 'bg-red-100 text-red-700',
      'pending': 'bg-yellow-100 text-yellow-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }
}