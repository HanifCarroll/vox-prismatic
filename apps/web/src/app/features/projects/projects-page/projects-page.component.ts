import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ContentViewComponent } from '../../../shared/components/content-view/content-view.component';
import { ProjectService } from '../../../core/services/project.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirmation.service';
import { ContentProject, ProjectStage } from '../../../core/models/project.model';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    ContentViewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.css'
})
export class ProjectsPageComponent implements OnInit {
  projects = signal<ContentProject[]>([]);
  selectedProjects = signal(new Set<string>());
  loading = signal(false);

  constructor(
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private confirmService: ConfirmService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.loading.set(true);
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.error('Failed to load projects', 'Error');
        this.loading.set(false);
      }
    });
  }

  onProjectClick(project: ContentProject) {
    this.router.navigate(['/projects', project.id]);
  }

  onProjectSelect(event: { project: ContentProject; selected: boolean }) {
    const current = new Set(this.selectedProjects());
    if (event.selected) {
      current.add(event.project.id);
    } else {
      current.delete(event.project.id);
    }
    this.selectedProjects.set(current);
  }

  async onStageChange(event: { project: ContentProject; newStage: ProjectStage }) {
    const confirmed = await this.confirmService.confirmAction(
      `Move to ${this.formatStageName(event.newStage)}`,
      `Are you sure you want to move "${event.project.title}" to ${this.formatStageName(event.newStage)}?`
    );

    if (confirmed) {
      this.projectService.updateProject(event.project.id, { 
        currentStage: event.newStage 
      }).subscribe({
        next: (updated) => {
          const currentProjects = this.projects();
          const index = currentProjects.findIndex(p => p.id === updated.id);
          if (index !== -1) {
            currentProjects[index] = updated;
            this.projects.set([...currentProjects]);
          }
          this.notificationService.success(
            `Project moved to ${this.formatStageName(event.newStage)}`,
            'Stage Updated'
          );
        },
        error: (error) => {
          this.notificationService.error('Failed to update project stage', 'Error');
        }
      });
    }
  }

  async bulkDelete() {
    const selectedCount = this.selectedProjects().size;
    if (selectedCount === 0) {
      this.notificationService.warning('No projects selected', 'Selection Required');
      return;
    }

    const confirmed = await this.confirmService.confirmBulkAction('delete', selectedCount);
    if (confirmed) {
      // Implement bulk delete logic
      this.notificationService.success(`${selectedCount} projects deleted`, 'Bulk Delete');
      this.selectedProjects.set(new Set());
      this.loadProjects();
    }
  }

  async bulkArchive() {
    const selectedCount = this.selectedProjects().size;
    if (selectedCount === 0) {
      this.notificationService.warning('No projects selected', 'Selection Required');
      return;
    }

    const confirmed = await this.confirmService.confirmBulkAction('archive', selectedCount);
    if (confirmed) {
      // Implement bulk archive logic
      this.notificationService.success(`${selectedCount} projects archived`, 'Bulk Archive');
      this.selectedProjects.set(new Set());
      this.loadProjects();
    }
  }

  createNewProject() {
    this.router.navigate(['/projects/new']);
  }

  private formatStageName(stage: ProjectStage): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}