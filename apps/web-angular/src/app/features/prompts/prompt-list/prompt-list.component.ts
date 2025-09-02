import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';

import { PromptsService, PromptTemplate } from '../../../core/services/prompts.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PromptEditDialogComponent } from '../prompt-edit-dialog/prompt-edit-dialog.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-prompt-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    SkeletonModule,
    DialogModule,
    PromptEditDialogComponent,
    RelativeTimePipe
  ],
  templateUrl: './prompt-list.component.html',
  styleUrl: './prompt-list.component.css'
})
export class PromptListComponent implements OnInit {
  prompts = signal<PromptTemplate[]>([]);
  filteredPrompts = signal<PromptTemplate[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  selectedPrompt = signal<PromptTemplate | null>(null);
  showEditDialog = signal(false);
  showCreateDialog = signal(false);

  constructor(
    private promptsService: PromptsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadPrompts();
  }

  loadPrompts() {
    this.loading.set(true);
    this.promptsService.getPrompts().subscribe({
      next: (prompts) => {
        this.prompts.set(prompts);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.error('Failed to load prompts', 'Error');
        this.loading.set(false);
      }
    });
  }

  applyFilter() {
    const query = this.searchQuery().toLowerCase();
    const allPrompts = this.prompts();
    
    if (!query) {
      this.filteredPrompts.set(allPrompts);
      return;
    }
    
    const filtered = allPrompts.filter(prompt =>
      prompt.name.toLowerCase().includes(query) ||
      prompt.title.toLowerCase().includes(query) ||
      prompt.description.toLowerCase().includes(query) ||
      prompt.variables.some(v => v.toLowerCase().includes(query))
    );
    
    this.filteredPrompts.set(filtered);
  }

  openPrompt(prompt: PromptTemplate) {
    this.selectedPrompt.set(prompt);
    this.showEditDialog.set(true);
  }

  createNewPrompt() {
    this.selectedPrompt.set({
      name: '',
      title: '',
      description: '',
      content: '',
      variables: [],
      lastModified: new Date().toISOString(),
      exists: false,
      size: 0
    });
    this.showCreateDialog.set(true);
  }

  onPromptSaved() {
    this.showEditDialog.set(false);
    this.showCreateDialog.set(false);
    this.loadPrompts();
    this.notificationService.success('Prompt saved successfully');
  }

  onDialogClose() {
    this.showEditDialog.set(false);
    this.showCreateDialog.set(false);
    this.selectedPrompt.set(null);
  }

  async deletePrompt(prompt: PromptTemplate, event: Event) {
    event.stopPropagation();
    
    if (confirm(`Are you sure you want to delete "${prompt.title || prompt.name}"?`)) {
      this.promptsService.deletePrompt(prompt.name).subscribe({
        next: () => {
          this.notificationService.success('Prompt deleted successfully');
          this.loadPrompts();
        },
        error: (error) => {
          this.notificationService.error('Failed to delete prompt', 'Error');
        }
      });
    }
  }

  getPromptCategory(name: string) {
    return this.promptsService.getPromptCategory(name);
  }

  formatPromptName(name: string): string {
    return this.promptsService.formatPromptName(name);
  }

  getVariableDisplay(variables: string[]): string {
    if (variables.length === 0) return 'No variables';
    if (variables.length === 1) return '1 variable';
    return `${variables.length} variables`;
  }

  getVariableList(variables: string[]): string {
    if (variables.length === 0) return '';
    if (variables.length <= 4) return variables.join(', ');
    return `${variables.slice(0, 4).join(', ')}, +${variables.length - 4} more`;
  }
}