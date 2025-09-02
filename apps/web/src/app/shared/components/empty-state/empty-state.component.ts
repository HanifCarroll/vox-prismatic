import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateType = 'no-projects' | 'no-results' | 'filtered-empty' | 'stage-empty' | 'error' | 'loading';

interface EmptyStateConfig {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  illustration?: string;
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state-container" [class]="containerClass">
      <div class="empty-state-content">
        <!-- Illustration or Icon -->
        <div class="empty-state-visual">
          @if (config.illustration) {
            <div class="illustration" [innerHTML]="config.illustration"></div>
          } @else {
            <div 
              class="icon-wrapper"
              [style.background-color]="config.iconColor + '10'"
            >
              <i 
                [class]="config.icon" 
                [style.color]="config.iconColor"
                class="text-5xl"
              ></i>
            </div>
          }
        </div>

        <!-- Text Content -->
        <div class="text-content">
          <h3 class="title">{{ config.title }}</h3>
          <p class="description">{{ config.description }}</p>
          
          <!-- Tips for filtered empty state -->
          @if (type === 'filtered-empty' && tips.length > 0) {
            <div class="tips-section">
              <p class="tips-title">Try:</p>
              <ul class="tips-list">
                @for (tip of tips; track tip) {
                  <li>{{ tip }}</li>
                }
              </ul>
            </div>
          }
        </div>

        <!-- Actions -->
        @if (config.actionLabel || config.secondaryActionLabel) {
          <div class="actions">
            @if (config.actionLabel) {
              <button 
                (click)="action.emit()"
                class="primary-action"
              >
                {{ config.actionLabel }}
              </button>
            }
            @if (config.secondaryActionLabel) {
              <button 
                (click)="secondaryAction.emit()"
                class="secondary-action"
              >
                {{ config.secondaryActionLabel }}
              </button>
            }
          </div>
        }

        <!-- Loading Animation -->
        @if (type === 'loading') {
          <div class="loading-animation">
            <div class="loading-bar"></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .empty-state-container {
      @apply flex items-center justify-center;
      min-height: 400px;
      padding: 2rem;
      
      &.compact {
        min-height: 250px;
        padding: 1rem;
      }
      
      &.full-height {
        min-height: calc(100vh - 200px);
      }
    }

    .empty-state-content {
      @apply text-center max-w-md mx-auto;
    }

    .empty-state-visual {
      @apply mb-6;
      
      .icon-wrapper {
        @apply w-20 h-20 rounded-full flex items-center justify-center mx-auto;
      }
      
      .illustration {
        @apply w-48 h-48 mx-auto;
      }
    }

    .text-content {
      .title {
        @apply text-xl font-semibold text-gray-900 mb-2;
      }
      
      .description {
        @apply text-gray-600 mb-4;
      }
      
      .tips-section {
        @apply mt-4 p-4 bg-gray-50 rounded-lg text-left inline-block;
        
        .tips-title {
          @apply text-sm font-medium text-gray-700 mb-2;
        }
        
        .tips-list {
          @apply space-y-1 text-sm text-gray-600;
          
          li {
            @apply flex items-start gap-2;
            
            &:before {
              content: '•';
              @apply text-gray-400 mt-0.5;
            }
          }
        }
      }
    }

    .actions {
      @apply flex items-center justify-center gap-3 mt-6;
      
      .primary-action {
        @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors;
      }
      
      .secondary-action {
        @apply px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
      }
    }

    .loading-animation {
      @apply mt-4;
      
      .loading-bar {
        @apply h-1 bg-blue-600 rounded-full mx-auto;
        animation: loading 1.5s ease-in-out infinite;
        width: 100px;
      }
    }

    @keyframes loading {
      0%, 100% {
        transform: translateX(-50px);
        opacity: 0.3;
      }
      50% {
        transform: translateX(50px);
        opacity: 1;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() type: EmptyStateType = 'no-projects';
  @Input() containerClass: 'default' | 'compact' | 'full-height' = 'default';
  @Input() customTitle?: string;
  @Input() customDescription?: string;
  @Input() tips: string[] = [];
  @Output() action = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  private configs: Record<EmptyStateType, EmptyStateConfig> = {
    'no-projects': {
      icon: 'pi pi-folder-open',
      iconColor: '#6b7280',
      title: 'No projects yet',
      description: 'Create your first project to start transforming your content into engaging social media posts.',
      actionLabel: 'Create Your First Project',
      illustration: this.getProjectsIllustration()
    },
    'no-results': {
      icon: 'pi pi-search',
      iconColor: '#3b82f6',
      title: 'No results found',
      description: 'We couldn\'t find any projects matching your search criteria.',
      actionLabel: 'Clear Search'
    },
    'filtered-empty': {
      icon: 'pi pi-filter',
      iconColor: '#8b5cf6',
      title: 'No matching projects',
      description: 'No projects match the current filters.',
      actionLabel: 'Clear All Filters',
      secondaryActionLabel: 'Adjust Filters'
    },
    'stage-empty': {
      icon: 'pi pi-inbox',
      iconColor: '#f59e0b',
      title: 'No projects in this stage',
      description: 'Move projects here by dragging them from other stages or advancing them through the pipeline.'
    },
    'error': {
      icon: 'pi pi-exclamation-triangle',
      iconColor: '#ef4444',
      title: 'Something went wrong',
      description: 'We encountered an error while loading your projects. Please try again.',
      actionLabel: 'Retry'
    },
    'loading': {
      icon: 'pi pi-spin pi-spinner',
      iconColor: '#3b82f6',
      title: 'Loading projects...',
      description: 'Please wait while we fetch your content projects.'
    }
  };

  get config(): EmptyStateConfig {
    const baseConfig = this.configs[this.type];
    return {
      ...baseConfig,
      title: this.customTitle || baseConfig.title,
      description: this.customDescription || baseConfig.description
    };
  }

  private getProjectsIllustration(): string {
    return `
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="60" width="120" height="80" rx="8" fill="#e5e7eb"/>
        <rect x="50" y="70" width="100" height="60" rx="4" fill="white"/>
        <rect x="60" y="80" width="60" height="4" rx="2" fill="#d1d5db"/>
        <rect x="60" y="90" width="80" height="4" rx="2" fill="#d1d5db"/>
        <rect x="60" y="100" width="40" height="4" rx="2" fill="#d1d5db"/>
        <circle cx="100" cy="110" r="3" fill="#3b82f6"/>
        <path d="M98 110 L100 112 L104 108" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
}