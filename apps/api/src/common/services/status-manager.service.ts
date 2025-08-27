import { Injectable, BadRequestException, Logger } from '@nestjs/common';

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
      validStatuses: ['draft', 'needs_review', 'approved', 'rejected', 'archived', 'extracted'],
      initialStatus: 'draft',
      finalStatuses: ['archived', 'rejected'],
      transitions: {
        draft: ['needs_review', 'approved', 'archived'],
        extracted: ['needs_review', 'approved', 'rejected', 'archived'],
        needs_review: ['approved', 'rejected', 'draft', 'archived'],
        approved: ['archived', 'needs_review'],
        rejected: ['draft', 'archived'],
        archived: [], // No transitions from archived
      },
    },
    post: {
      validStatuses: ['draft', 'review', 'approved', 'published', 'archived'],
      initialStatus: 'draft',
      finalStatuses: ['published', 'archived'],
      transitions: {
        draft: ['review', 'approved', 'archived'],
        review: ['approved', 'draft', 'archived'],
        approved: ['published', 'review', 'archived'],
        published: ['archived'], // Can only archive published posts
        archived: [], // No transitions from archived
      },
    },
    scheduledPost: {
      validStatuses: ['pending', 'published', 'failed', 'cancelled'],
      initialStatus: 'pending',
      finalStatuses: ['published', 'cancelled'],
      transitions: {
        pending: ['published', 'failed', 'cancelled'],
        failed: ['pending', 'cancelled'], // Can retry failed posts
        published: [], // No transitions from published
        cancelled: [], // No transitions from cancelled
      },
    },
    transcript: {
      validStatuses: ['processing', 'completed', 'cleaned', 'insights_generated', 'failed'],
      initialStatus: 'processing',
      finalStatuses: ['insights_generated', 'failed'],
      transitions: {
        processing: ['completed', 'failed'],
        completed: ['cleaned', 'failed'],
        cleaned: ['insights_generated', 'failed'],
        insights_generated: [], // No further transitions
        failed: ['processing'], // Can retry failed transcripts
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
      if (insightValidation.status === 'rejected' && postValidation.status === 'published') {
        throw new BadRequestException(
          'Cannot publish a post when its source insight is rejected'
        );
      }

      if (insightValidation.status === 'archived' && !['archived', 'published'].includes(postValidation.status)) {
        throw new BadRequestException(
          'Posts must be archived or published when their source insight is archived'
        );
      }
    }

    // Example: Scheduled posts cannot be published if the post is not approved
    const scheduledPostValidation = validations.find(v => v.entityType === 'scheduledPost');

    if (postValidation && scheduledPostValidation) {
      if (postValidation.status !== 'approved' && scheduledPostValidation.status === 'published') {
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
        draft: 'Initial state, being edited',
        extracted: 'Extracted from transcript by AI',
        needs_review: 'Awaiting human review',
        approved: 'Approved for post generation',
        rejected: 'Rejected, will not be used',
        archived: 'Archived, no longer active',
      },
      post: {
        draft: 'Being created or edited',
        review: 'Under review',
        approved: 'Approved for publishing',
        published: 'Published to social media',
        archived: 'Archived, no longer active',
      },
      scheduledPost: {
        pending: 'Waiting to be published',
        published: 'Successfully published',
        failed: 'Publishing failed',
        cancelled: 'Publishing cancelled',
      },
      transcript: {
        processing: 'Being processed',
        completed: 'Processing complete',
        cleaned: 'Cleaned by AI',
        insights_generated: 'Insights extracted',
        failed: 'Processing failed',
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