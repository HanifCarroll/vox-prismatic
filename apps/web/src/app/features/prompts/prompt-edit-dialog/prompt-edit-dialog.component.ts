import { Component, Input, Output, EventEmitter, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabview';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';

import { PromptsService, PromptTemplate } from '../../../core/services/prompts.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-prompt-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    TagModule,
    TabViewModule,
    ChipModule,
    TooltipModule,
    MessageModule
  ],
  templateUrl: './prompt-edit-dialog.component.html',
  styleUrl: './prompt-edit-dialog.component.css'
})
export class PromptEditDialogComponent implements OnInit {
  @Input() prompt!: PromptTemplate;
  @Input() visible = false;
  @Input() isNew = false;
  @Output() onSave = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  // Edit state
  editMode = signal(false);
  saving = signal(false);
  
  // Form fields
  name = signal('');
  title = signal('');
  description = signal('');
  content = signal('');
  originalContent = signal('');
  
  // Computed properties
  hasChanges = computed(() => {
    if (this.isNew) {
      return this.name().trim().length > 0 && this.content().trim().length > 0;
    }
    return this.content() !== this.originalContent();
  });

  variables = computed(() => {
    return this.promptsService.extractVariables(this.content());
  });

  addedVariables = computed(() => {
    const current = this.variables();
    const original = this.prompt?.variables || [];
    return current.filter(v => !original.includes(v));
  });

  removedVariables = computed(() => {
    const current = this.variables();
    const original = this.prompt?.variables || [];
    return original.filter(v => !current.includes(v));
  });

  metrics = computed(() => {
    return this.promptsService.getPromptMetrics(this.content());
  });

  validation = computed(() => {
    return this.promptsService.validatePrompt(this.content());
  });

  category = computed(() => {
    return this.promptsService.getPromptCategory(this.name() || this.prompt?.name || '');
  });

  constructor(
    private promptsService: PromptsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    if (this.prompt) {
      this.name.set(this.prompt.name);
      this.title.set(this.prompt.title);
      this.description.set(this.prompt.description);
      this.content.set(this.prompt.content);
      this.originalContent.set(this.prompt.content);
    }
    
    if (this.isNew) {
      this.editMode.set(true);
    }
  }

  toggleEditMode() {
    this.editMode.update(v => !v);
    if (!this.editMode() && this.hasChanges()) {
      // Reset to original if canceling edit
      this.content.set(this.originalContent());
    }
  }

  async save() {
    if (!this.validation().valid) {
      this.notificationService.error(
        this.validation().errors.join(', '),
        'Validation Error'
      );
      return;
    }

    this.saving.set(true);

    try {
      if (this.isNew) {
        await this.promptsService.createPrompt(
          this.name(),
          this.content(),
          this.title(),
          this.description()
        ).toPromise();
      } else {
        await this.promptsService.updatePrompt(
          this.prompt.name,
          this.content()
        ).toPromise();
      }

      this.originalContent.set(this.content());
      this.editMode.set(false);
      this.onSave.emit();
      this.notificationService.success(
        this.isNew ? 'Prompt created successfully' : 'Prompt updated successfully'
      );
    } catch (error) {
      this.notificationService.error(
        'Failed to save prompt',
        'Error'
      );
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    if (this.hasChanges()) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    this.onClose.emit();
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.content()).then(() => {
      this.notificationService.info('Prompt copied to clipboard');
    });
  }

  insertVariable(variableName: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = this.content();
      const before = text.substring(0, start);
      const after = text.substring(end);
      this.content.set(before + `{{${variableName}}}` + after);
      
      // Reset cursor position
      setTimeout(() => {
        textarea.selectionStart = start + variableName.length + 4;
        textarea.selectionEnd = start + variableName.length + 4;
        textarea.focus();
      }, 0);
    }
  }

  getDialogHeader(): string {
    if (this.isNew) {
      return 'Create New Prompt';
    }
    return this.editMode() ? 'Edit Prompt' : 'View Prompt';
  }
}