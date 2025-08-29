import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { 
  InsightStatus,
  PostStatus,
  ScheduledPostStatus,
  TranscriptStatus
} from '@content-creation/types';

/**
 * Valid status transitions for different entity types
 */
interface StatusTransitionConfig {
  [currentStatus: string]: string[];
}

/**
 * Entity-specific status configurations
 */
interface EntityStatusConfig {
  validStatuses: string[];
  initialStatus: string;
  finalStatuses: string[];
  transitions: StatusTransitionConfig;
}

/**
 * Centralized status management service
 * Ensures consistent status transitions across all entities
 */
@Injectable()
export class StatusManagerService {
  private readonly logger = new Logger(StatusManagerService.name);

  // Status configurations for each entity type
  private readonly statusConfigs: Record<string, EntityStatusConfig> = {
    insight: {
      validStatuses: Object.values(InsightStatus),
      initialStatus: InsightStatus.DRAFT,
      finalStatuses: [InsightStatus.ARCHIVED, InsightStatus.REJECTED],
      transitions: {
        [InsightStatus.DRAFT]: [InsightStatus.NEEDS_REVIEW, InsightStatus.APPROVED, InsightStatus.REJECTED, InsightStatus.ARCHIVED],
        [InsightStatus.NEEDS_REVIEW]: [InsightStatus.APPROVED, InsightStatus.REJECTED, InsightStatus.DRAFT, InsightStatus.ARCHIVED],
        [InsightStatus.APPROVED]: [InsightStatus.ARCHIVED, InsightStatus.NEEDS_REVIEW],
        [InsightStatus.REJECTED]: [InsightStatus.DRAFT, InsightStatus.ARCHIVED],
        [InsightStatus.ARCHIVED]: [], // No transitions from archived
      },
    },
    post: {
      validStatuses: Object.values(PostStatus),
      initialStatus: PostStatus.DRAFT,
      finalStatuses: [PostStatus.PUBLISHED, PostStatus.ARCHIVED],
      transitions: {
        [PostStatus.DRAFT]: [PostStatus.NEEDS_REVIEW, PostStatus.APPROVED, PostStatus.ARCHIVED],
        [PostStatus.NEEDS_REVIEW]: [PostStatus.APPROVED, PostStatus.DRAFT, PostStatus.ARCHIVED],
        [PostStatus.APPROVED]: [PostStatus.PUBLISHED, PostStatus.NEEDS_REVIEW, PostStatus.ARCHIVED, PostStatus.SCHEDULED],
        [PostStatus.SCHEDULED]: [PostStatus.PUBLISHED, PostStatus.APPROVED, PostStatus.ARCHIVED], // Can publish scheduled posts or return to approved
        [PostStatus.PUBLISHED]: [PostStatus.ARCHIVED], // Can only archive published posts
        [PostStatus.ARCHIVED]: [], // No transitions from archived
      },
    },
    scheduledPost: {
      validStatuses: Object.values(ScheduledPostStatus),
      initialStatus: ScheduledPostStatus.PENDING,
      finalStatuses: [ScheduledPostStatus.PUBLISHED, ScheduledPostStatus.CANCELLED],
      transitions: {
        [ScheduledPostStatus.PENDING]: [ScheduledPostStatus.PUBLISHED, ScheduledPostStatus.FAILED, ScheduledPostStatus.CANCELLED],
        [ScheduledPostStatus.FAILED]: [ScheduledPostStatus.PENDING, ScheduledPostStatus.CANCELLED], // Can retry failed posts
        [ScheduledPostStatus.PUBLISHED]: [], // No transitions from published
        [ScheduledPostStatus.CANCELLED]: [], // No transitions from cancelled
      },
    },
    transcript: {
      validStatuses: Object.values(TranscriptStatus),
      initialStatus: TranscriptStatus.PROCESSING,
      finalStatuses: [TranscriptStatus.CLEANED, TranscriptStatus.FAILED],
      transitions: {
        [TranscriptStatus.PROCESSING]: [TranscriptStatus.CLEANED, TranscriptStatus.FAILED],
        [TranscriptStatus.CLEANED]: [], // No further transitions
        [TranscriptStatus.FAILED]: [TranscriptStatus.PROCESSING], // Can retry failed transcripts
      },
    },
  };

  /**
   * Validate if a status transition is allowed
   */
  validateTransition(
    entityType: string,
    currentStatus: string,
    newStatus: string,
  ): void {
    const config = this.statusConfigs[entityType];
    
    if (!config) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    // Check if statuses are valid
    if (!config.validStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Invalid current status '${currentStatus}' for ${entityType}. Valid statuses: ${config.validStatuses.join(', ')}`
      );
    }

    if (!config.validStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid new status '${newStatus}' for ${entityType}. Valid statuses: ${config.validStatuses.join(', ')}`
      );
    }

    // Check if transition is allowed
    const allowedTransitions = config.transitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition for ${entityType}: '${currentStatus}' → '${newStatus}'. ` +
        `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none'}`
      );
    }

    this.logger.debug(
      `Valid status transition for ${entityType}: ${currentStatus} → ${newStatus}`
    );
  }

  /**
   * Check if a status is final (no further transitions allowed)
   */
  isFinalStatus(entityType: string, status: string): boolean {
    const config = this.statusConfigs[entityType];
    
    if (!config) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    return config.finalStatuses.includes(status);
  }

  /**
   * Get the initial status for an entity type
   */
  getInitialStatus(entityType: string): string {
    const config = this.statusConfigs[entityType];
    
    if (!config) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    return config.initialStatus;
  }

  /**
   * Get allowed transitions from a current status
   */
  getAllowedTransitions(entityType: string, currentStatus: string): string[] {
    const config = this.statusConfigs[entityType];
    
    if (!config) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    if (!config.validStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Invalid status '${currentStatus}' for ${entityType}`
      );
    }

    return config.transitions[currentStatus] || [];
  }

  /**
   * Validate status consistency between related entities
   */
  validateRelatedStatuses(validations: {
    entityType: string;
    status: string;
  }[]): void {
    // Example: A post cannot be published if its insight is rejected
    const insightValidation = validations.find(v => v.entityType === 'insight');
    const postValidation = validations.find(v => v.entityType === 'post');

    if (insightValidation && postValidation) {
      if (insightValidation.status === InsightStatus.REJECTED && postValidation.status === PostStatus.PUBLISHED) {
        throw new BadRequestException(
          'Cannot publish a post when its source insight is rejected'
        );
      }

      if (insightValidation.status === InsightStatus.ARCHIVED && ![PostStatus.ARCHIVED, PostStatus.PUBLISHED].includes(postValidation.status as PostStatus)) {
        throw new BadRequestException(
          'Posts must be archived or published when their source insight is archived'
        );
      }
    }

    // Example: Scheduled posts cannot be published if the post is not approved
    const scheduledPostValidation = validations.find(v => v.entityType === 'scheduledPost');

    if (postValidation && scheduledPostValidation) {
      if (postValidation.status !== PostStatus.APPROVED && scheduledPostValidation.status === ScheduledPostStatus.PUBLISHED) {
        throw new BadRequestException(
          'Cannot publish a scheduled post when the post is not approved'
        );
      }
    }
  }

  /**
   * Get a human-readable description of a status
   */
  getStatusDescription(entityType: string, status: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      insight: {
        [InsightStatus.DRAFT]: 'Initial state, being edited',
        [InsightStatus.NEEDS_REVIEW]: 'Awaiting human review',
        [InsightStatus.APPROVED]: 'Approved for post generation',
        [InsightStatus.REJECTED]: 'Rejected, will not be used',
        [InsightStatus.ARCHIVED]: 'Archived, no longer active',
      },
      post: {
        [PostStatus.DRAFT]: 'Being created or edited',
        [PostStatus.NEEDS_REVIEW]: 'Under review',
        [PostStatus.APPROVED]: 'Approved for publishing',
        [PostStatus.SCHEDULED]: 'Scheduled for future publishing',
        [PostStatus.PUBLISHED]: 'Published to social media',
        [PostStatus.ARCHIVED]: 'Archived, no longer active',
      },
      scheduledPost: {
        [ScheduledPostStatus.PENDING]: 'Waiting to be published',
        [ScheduledPostStatus.PUBLISHED]: 'Successfully published',
        [ScheduledPostStatus.FAILED]: 'Publishing failed',
        [ScheduledPostStatus.CANCELLED]: 'Publishing cancelled',
      },
      transcript: {
        [TranscriptStatus.PROCESSING]: 'Being processed',
        [TranscriptStatus.CLEANED]: 'Cleaned by AI',
        [TranscriptStatus.FAILED]: 'Processing failed',
      },
    };

    return descriptions[entityType]?.[status] || 'Unknown status';
  }

  /**
   * Batch validate multiple status transitions
   */
  batchValidateTransitions(transitions: {
    entityType: string;
    currentStatus: string;
    newStatus: string;
  }[]): void {
    for (const transition of transitions) {
      this.validateTransition(
        transition.entityType,
        transition.currentStatus,
        transition.newStatus
      );
    }
  }
}