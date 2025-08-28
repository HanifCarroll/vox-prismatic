/**
 * Pipeline Templates
 * Pre-configured pipeline settings for different content types
 */

import { PipelineOptions, PipelineTemplate } from './pipeline-context.types';

/**
 * Template configuration interface
 */
export interface PipelineTemplateConfig {
  name: string;
  description: string;
  template: PipelineTemplate;
  options: PipelineOptions;
  estimatedDuration: number; // in milliseconds
  steps: {
    id: string;
    name: string;
    estimatedDuration: number;
    required: boolean;
    parallel?: boolean;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Standard pipeline template - Full workflow with all review steps
 */
export const STANDARD_TEMPLATE: PipelineTemplateConfig = {
  name: 'Standard Pipeline',
  description: 'Complete content pipeline with manual review at each stage',
  template: 'standard',
  options: {
    autoApprove: false,
    platforms: ['linkedin', 'x'],
    skipInsightReview: false,
    skipPostReview: false,
    maxRetries: 3,
    parallelInsights: 3,
    parallelPosts: 5,
    notifyOnCompletion: true,
    notifyOnFailure: true
  },
  estimatedDuration: 15 * 60 * 1000, // 15 minutes
  steps: [
    { id: 'init', name: 'Initialize Pipeline', estimatedDuration: 1000, required: true },
    { id: 'clean', name: 'Clean Transcript', estimatedDuration: 30000, required: true },
    { id: 'extract', name: 'Extract Insights', estimatedDuration: 60000, required: true },
    { id: 'review-insights', name: 'Review Insights', estimatedDuration: 300000, required: true },
    { id: 'generate', name: 'Generate Posts', estimatedDuration: 45000, required: true, parallel: true },
    { id: 'review-posts', name: 'Review Posts', estimatedDuration: 180000, required: true },
    { id: 'schedule', name: 'Schedule Posts', estimatedDuration: 10000, required: false }
  ]
};

/**
 * Fast track template - Minimal review, auto-approve most items
 */
export const FAST_TRACK_TEMPLATE: PipelineTemplateConfig = {
  name: 'Fast Track Pipeline',
  description: 'Accelerated pipeline with automatic approvals',
  template: 'fast_track',
  options: {
    autoApprove: true,
    platforms: ['linkedin', 'x'],
    skipInsightReview: true,
    skipPostReview: false, // Still review posts for quality
    maxRetries: 2,
    parallelInsights: 5,
    parallelPosts: 10,
    notifyOnCompletion: true,
    notifyOnFailure: true
  },
  estimatedDuration: 5 * 60 * 1000, // 5 minutes
  steps: [
    { id: 'init', name: 'Initialize Pipeline', estimatedDuration: 1000, required: true },
    { id: 'clean', name: 'Clean Transcript', estimatedDuration: 30000, required: true },
    { id: 'extract', name: 'Extract Insights', estimatedDuration: 60000, required: true },
    { id: 'generate', name: 'Generate Posts', estimatedDuration: 45000, required: true, parallel: true },
    { id: 'review-posts', name: 'Quick Post Review', estimatedDuration: 60000, required: true },
    { id: 'schedule', name: 'Auto-Schedule Posts', estimatedDuration: 10000, required: true }
  ]
};

/**
 * Podcast template - Optimized for podcast transcripts
 */
export const PODCAST_TEMPLATE: PipelineTemplateConfig = {
  name: 'Podcast Pipeline',
  description: 'Optimized for extracting insights from podcast conversations',
  template: 'podcast',
  options: {
    autoApprove: false,
    platforms: ['linkedin', 'x'],
    skipInsightReview: false,
    skipPostReview: false,
    maxRetries: 3,
    parallelInsights: 5, // More insights expected from podcasts
    parallelPosts: 8,
    notifyOnCompletion: true,
    notifyOnFailure: true
  },
  estimatedDuration: 20 * 60 * 1000, // 20 minutes
  steps: [
    { id: 'init', name: 'Initialize Pipeline', estimatedDuration: 1000, required: true },
    { id: 'clean', name: 'Clean Podcast Transcript', estimatedDuration: 45000, required: true },
    { id: 'extract', name: 'Extract Conversation Insights', estimatedDuration: 90000, required: true },
    { id: 'review-insights', name: 'Review Key Moments', estimatedDuration: 300000, required: true },
    { id: 'generate', name: 'Generate Episode Posts', estimatedDuration: 60000, required: true, parallel: true },
    { id: 'review-posts', name: 'Review Social Posts', estimatedDuration: 180000, required: true },
    { id: 'schedule', name: 'Schedule Episode Promotion', estimatedDuration: 15000, required: false }
  ],
  metadata: {
    contentType: 'podcast',
    expectedInsights: 8,
    focusAreas: ['quotes', 'key_takeaways', 'guest_expertise', 'actionable_advice']
  }
};

/**
 * Video template - Optimized for video content
 */
export const VIDEO_TEMPLATE: PipelineTemplateConfig = {
  name: 'Video Pipeline',
  description: 'Optimized for video content with visual elements',
  template: 'video',
  options: {
    autoApprove: false,
    platforms: ['linkedin', 'x'],
    skipInsightReview: false,
    skipPostReview: false,
    maxRetries: 3,
    parallelInsights: 4,
    parallelPosts: 6,
    notifyOnCompletion: true,
    notifyOnFailure: true
  },
  estimatedDuration: 18 * 60 * 1000, // 18 minutes
  steps: [
    { id: 'init', name: 'Initialize Pipeline', estimatedDuration: 1000, required: true },
    { id: 'clean', name: 'Clean Video Transcript', estimatedDuration: 40000, required: true },
    { id: 'extract', name: 'Extract Visual & Audio Insights', estimatedDuration: 80000, required: true },
    { id: 'review-insights', name: 'Review Key Scenes', estimatedDuration: 240000, required: true },
    { id: 'generate', name: 'Generate Video Clips Posts', estimatedDuration: 50000, required: true, parallel: true },
    { id: 'review-posts', name: 'Review Video Posts', estimatedDuration: 150000, required: true },
    { id: 'schedule', name: 'Schedule Video Series', estimatedDuration: 12000, required: false }
  ],
  metadata: {
    contentType: 'video',
    expectedInsights: 6,
    focusAreas: ['visual_moments', 'demonstrations', 'key_points', 'calls_to_action']
  }
};

/**
 * Article template - Optimized for written content
 */
export const ARTICLE_TEMPLATE: PipelineTemplateConfig = {
  name: 'Article Pipeline',
  description: 'Optimized for written articles and blog posts',
  template: 'article',
  options: {
    autoApprove: false,
    platforms: ['linkedin', 'x'],
    skipInsightReview: true, // Articles are already edited
    skipPostReview: false,
    maxRetries: 3,
    parallelInsights: 3,
    parallelPosts: 4,
    notifyOnCompletion: true,
    notifyOnFailure: true
  },
  estimatedDuration: 10 * 60 * 1000, // 10 minutes
  steps: [
    { id: 'init', name: 'Initialize Pipeline', estimatedDuration: 1000, required: true },
    { id: 'clean', name: 'Process Article Text', estimatedDuration: 20000, required: true },
    { id: 'extract', name: 'Extract Key Points', estimatedDuration: 50000, required: true },
    { id: 'generate', name: 'Generate Summary Posts', estimatedDuration: 40000, required: true, parallel: true },
    { id: 'review-posts', name: 'Review Article Posts', estimatedDuration: 120000, required: true },
    { id: 'schedule', name: 'Schedule Article Promotion', estimatedDuration: 8000, required: false }
  ],
  metadata: {
    contentType: 'article',
    expectedInsights: 4,
    focusAreas: ['main_thesis', 'supporting_points', 'statistics', 'conclusions']
  }
};

/**
 * Custom template - User-defined configuration
 */
export const CUSTOM_TEMPLATE: PipelineTemplateConfig = {
  name: 'Custom Pipeline',
  description: 'User-defined pipeline configuration',
  template: 'custom',
  options: {
    autoApprove: false,
    platforms: ['linkedin'],
    skipInsightReview: false,
    skipPostReview: false,
    maxRetries: 3,
    parallelInsights: 3,
    parallelPosts: 5,
    notifyOnCompletion: true,
    notifyOnFailure: true
  },
  estimatedDuration: 0, // Will be calculated based on selected steps
  steps: [] // Will be defined by user
};

/**
 * Template registry
 */
export const PIPELINE_TEMPLATES: Map<PipelineTemplate, PipelineTemplateConfig> = new Map([
  ['standard', STANDARD_TEMPLATE],
  ['fast_track', FAST_TRACK_TEMPLATE],
  ['podcast', PODCAST_TEMPLATE],
  ['video', VIDEO_TEMPLATE],
  ['article', ARTICLE_TEMPLATE],
  ['custom', CUSTOM_TEMPLATE]
]);

/**
 * Get template configuration
 */
export function getTemplateConfig(template: PipelineTemplate): PipelineTemplateConfig {
  return PIPELINE_TEMPLATES.get(template) || STANDARD_TEMPLATE;
}

/**
 * Calculate estimated duration for a custom configuration
 */
export function calculateEstimatedDuration(steps: PipelineTemplateConfig['steps']): number {
  return steps.reduce((total, step) => {
    // Parallel steps don't add to total duration
    if (step.parallel) {
      return total + (step.estimatedDuration / 2); // Assume 50% overlap
    }
    return total + step.estimatedDuration;
  }, 0);
}

/**
 * Merge template options with custom options
 */
export function mergeTemplateOptions(
  template: PipelineTemplate,
  customOptions: Partial<PipelineOptions>
): PipelineOptions {
  const templateConfig = getTemplateConfig(template);
  return {
    ...templateConfig.options,
    ...customOptions,
    template // Ensure template is preserved
  };
}

/**
 * Validate template configuration
 */
export function validateTemplateConfig(config: PipelineTemplateConfig): boolean {
  // Check required fields
  if (!config.name || !config.template || !config.options) {
    return false;
  }
  
  // Check steps have required fields
  for (const step of config.steps) {
    if (!step.id || !step.name || step.estimatedDuration < 0) {
      return false;
    }
  }
  
  // Check options are valid
  if (config.options.maxRetries < 0 || 
      config.options.parallelInsights < 1 ||
      config.options.parallelPosts < 1) {
    return false;
  }
  
  return true;
}

/**
 * Get recommended template based on content characteristics
 */
export function recommendTemplate(
  contentLength: number,
  sourceType?: string,
  urgency?: 'high' | 'medium' | 'low'
): PipelineTemplate {
  // Fast track for urgent content
  if (urgency === 'high') {
    return 'fast_track';
  }
  
  // Based on source type
  if (sourceType) {
    switch (sourceType.toLowerCase()) {
      case 'podcast':
      case 'audio':
        return 'podcast';
      case 'video':
      case 'youtube':
        return 'video';
      case 'article':
      case 'blog':
      case 'text':
        return 'article';
    }
  }
  
  // Based on content length
  if (contentLength < 5000) {
    return 'article';
  } else if (contentLength < 15000) {
    return 'standard';
  } else {
    return 'podcast'; // Longer content likely conversational
  }
}