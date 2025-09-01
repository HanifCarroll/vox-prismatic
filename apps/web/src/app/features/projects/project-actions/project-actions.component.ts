import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { ContentProject, ProjectStage, Insight, Post } from '../../../core/models/project.model';
import { ConfirmService } from '../../../core/services/confirmation.service';

interface ProjectAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  primary?: boolean;
  severity?: string;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}

@Component({
  selector: 'app-project-actions',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TooltipModule,
    ConfirmDialogModule
  ],
  templateUrl: './project-actions.component.html',
  styleUrl: './project-actions.component.css'
})
export class ProjectActionsComponent {
  @Input() project!: ContentProject;
  @Input() insights: Insight[] = [];
  @Input() posts: Post[] = [];
  @Output() actionTriggered = new EventEmitter<string>();

  constructor(private confirmService: ConfirmService) {}

  get availableActions(): ProjectAction[] {
    const actions: ProjectAction[] = [];
    const stage = this.project?.currentStage;

    if (!stage) return actions;

    // Process Content Action
    if (stage === ProjectStage.RAW_CONTENT) {
      actions.push({
        id: 'process-content',
        label: 'Process Content',
        icon: 'pi pi-cog',
        description: 'Clean and analyze the transcript',
        enabled: true,
        primary: true,
        severity: 'primary'
      });
    }

    // Extract Insights Action
    if (stage === ProjectStage.PROCESSING_CONTENT || 
        stage === ProjectStage.RAW_CONTENT ||
        (stage === ProjectStage.INSIGHTS_READY && this.insights.length === 0)) {
      actions.push({
        id: 'extract-insights',
        label: 'Extract Insights',
        icon: 'pi pi-lightbulb',
        description: 'Generate insights from the content',
        enabled: stage === ProjectStage.PROCESSING_CONTENT || this.insights.length === 0,
        primary: stage === ProjectStage.PROCESSING_CONTENT,
        severity: 'primary'
      });
    }

    // Generate Posts Action
    if (stage === ProjectStage.INSIGHTS_APPROVED || 
        (stage === ProjectStage.POSTS_GENERATED && this.hasApprovedInsights())) {
      actions.push({
        id: 'generate-posts',
        label: 'Generate Posts',
        icon: 'pi pi-pencil',
        description: 'Create social media posts from insights',
        enabled: this.hasApprovedInsights(),
        primary: stage === ProjectStage.INSIGHTS_APPROVED,
        severity: 'primary'
      });
    }

    // Schedule Posts Action
    if (stage === ProjectStage.POSTS_APPROVED || 
        (stage === ProjectStage.SCHEDULED && this.hasApprovedPosts())) {
      actions.push({
        id: 'schedule-posts',
        label: 'Schedule Posts',
        icon: 'pi pi-calendar',
        description: 'Schedule posts for publishing',
        enabled: this.hasApprovedPosts(),
        primary: stage === ProjectStage.POSTS_APPROVED,
        severity: 'success'
      });
    }

    // Publish Now Action
    if (stage === ProjectStage.SCHEDULED || stage === ProjectStage.POSTS_APPROVED) {
      actions.push({
        id: 'publish-now',
        label: 'Publish Now',
        icon: 'pi pi-send',
        description: 'Publish all approved posts immediately',
        enabled: this.hasApprovedPosts(),
        severity: 'warning',
        requiresConfirmation: true,
        confirmMessage: 'Are you sure you want to publish all approved posts immediately?'
      });
    }

    // View Results Action
    if (stage === ProjectStage.PUBLISHED) {
      actions.push({
        id: 'view-results',
        label: 'View Results',
        icon: 'pi pi-chart-line',
        description: 'View publishing results and analytics',
        enabled: true,
        primary: true,
        severity: 'info'
      });
    }

    // Archive Project Action (always available except when already archived)
    if (stage !== ProjectStage.ARCHIVED) {
      actions.push({
        id: 'archive',
        label: 'Archive Project',
        icon: 'pi pi-box',
        description: 'Archive this project',
        enabled: true,
        severity: 'secondary',
        requiresConfirmation: true,
        confirmMessage: 'Are you sure you want to archive this project? This action can be reversed.'
      });
    }

    // Unarchive Action
    if (stage === ProjectStage.ARCHIVED) {
      actions.push({
        id: 'unarchive',
        label: 'Unarchive Project',
        icon: 'pi pi-replay',
        description: 'Restore this project from archive',
        enabled: true,
        primary: true,
        severity: 'primary'
      });
    }

    // Additional context-aware actions
    this.addContextualActions(actions, stage);

    return actions;
  }

  private addContextualActions(actions: ProjectAction[], stage: ProjectStage) {
    // Re-process Action (available after initial processing)
    if (stage !== ProjectStage.RAW_CONTENT && stage !== ProjectStage.ARCHIVED) {
      actions.push({
        id: 'reprocess',
        label: 'Re-process',
        icon: 'pi pi-refresh',
        description: 'Re-process the content from scratch',
        enabled: true,
        severity: 'secondary',
        requiresConfirmation: true,
        confirmMessage: 'Re-processing will reset all insights and posts. Continue?'
      });
    }

    // Export Data Action
    actions.push({
      id: 'export',
      label: 'Export Data',
      icon: 'pi pi-download',
      description: 'Export project data',
      enabled: true,
      severity: 'secondary'
    });

    // Review Required Indicator
    if (this.needsReview()) {
      actions.unshift({
        id: 'review-required',
        label: `${this.getReviewCount()} items need review`,
        icon: 'pi pi-exclamation-circle',
        description: 'Review pending items',
        enabled: false,
        severity: 'warning'
      });
    }
  }

  async onActionClick(action: ProjectAction) {
    if (action.requiresConfirmation) {
      const confirmed = await this.confirmService.confirmAction(
        action.label,
        action.confirmMessage
      );
      if (!confirmed) return;
    }

    this.actionTriggered.emit(action.id);
  }

  private hasApprovedInsights(): boolean {
    return this.insights.some(i => i.isApproved);
  }

  private hasApprovedPosts(): boolean {
    return this.posts.some(p => p.isApproved);
  }

  needsReview(): boolean {
    const stage = this.project?.currentStage;
    return stage === ProjectStage.INSIGHTS_READY || 
           stage === ProjectStage.POSTS_GENERATED;
  }

  getReviewCount(): number {
    let count = 0;
    if (this.project?.currentStage === ProjectStage.INSIGHTS_READY) {
      count += this.insights.filter(i => !i.isApproved).length;
    }
    if (this.project?.currentStage === ProjectStage.POSTS_GENERATED) {
      count += this.posts.filter(p => !p.isApproved).length;
    }
    return count;
  }

  getSuggestedAction(): ProjectAction | null {
    const actions = this.availableActions;
    return actions.find(a => a.primary && a.enabled) || null;
  }

  getSecondaryActions(): ProjectAction[] {
    return this.availableActions.filter(a => !a.primary && a.enabled);
  }

  getDisabledActions(): ProjectAction[] {
    return this.availableActions.filter(a => !a.enabled);
  }


  formatStage(stage: ProjectStage): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  getStageHelpText(stage: ProjectStage): string {
    const helpTexts: Record<ProjectStage, string> = {
      [ProjectStage.RAW_CONTENT]: 'Process your content to extract the transcript and prepare it for analysis.',
      [ProjectStage.PROCESSING_CONTENT]: 'AI is analyzing your content. This may take a few minutes.',
      [ProjectStage.INSIGHTS_READY]: 'Review and approve the insights generated from your content.',
      [ProjectStage.INSIGHTS_APPROVED]: 'Generate social media posts from your approved insights.',
      [ProjectStage.POSTS_GENERATED]: 'Review, edit, and approve the generated posts.',
      [ProjectStage.POSTS_APPROVED]: 'Schedule your posts for optimal publishing times.',
      [ProjectStage.SCHEDULED]: 'Your posts are scheduled and will be published automatically.',
      [ProjectStage.PUBLISHING]: 'Posts are being published to your social media platforms.',
      [ProjectStage.PUBLISHED]: 'All posts have been successfully published.',
      [ProjectStage.ARCHIVED]: 'This project is archived. Unarchive to continue working on it.'
    };
    return helpTexts[stage] || 'Select an action to continue processing your content.';
  }
}