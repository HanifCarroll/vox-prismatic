import { createMachine, assign, sendTo, raise, fromPromise } from 'xstate';
import { 
  PipelineContext, 
  PipelineState,
  PipelineStep,
  InsightProcessingState,
  PostProcessingState,
  BlockingItem,
  calculateProgress,
  canRetryPipeline,
  hasBlockingItems
} from './pipeline-context.types';

/**
 * Events that can trigger pipeline state transitions
 */
export type PipelineEvent =
  // Control events
  | { type: 'START'; transcriptId: string; options?: any }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CANCEL' }
  | { type: 'RETRY' }
  
  // Processing events
  | { type: 'TRANSCRIPT_CLEANED'; transcriptId: string; wordCount: number }
  | { type: 'TRANSCRIPT_CLEANING_FAILED'; error: string }
  | { type: 'INSIGHTS_EXTRACTED'; insightIds: string[]; count: number }
  | { type: 'INSIGHT_EXTRACTION_FAILED'; error: string }
  | { type: 'INSIGHT_APPROVED'; insightId: string; approvedBy?: string }
  | { type: 'INSIGHT_REJECTED'; insightId: string; reason?: string }
  | { type: 'ALL_INSIGHTS_REVIEWED' }
  | { type: 'POSTS_GENERATED'; postIds: string[]; insightId: string }
  | { type: 'POST_GENERATION_FAILED'; insightId: string; error: string }
  | { type: 'POST_APPROVED'; postId: string; platform: string }
  | { type: 'POST_REJECTED'; postId: string; reason?: string }
  | { type: 'ALL_POSTS_REVIEWED' }
  | { type: 'POSTS_SCHEDULED'; postIds: string[] }
  | { type: 'SCHEDULING_FAILED'; error: string }
  
  // Progress events
  | { type: 'UPDATE_PROGRESS' }
  | { type: 'ADD_BLOCKING_ITEM'; item: BlockingItem }
  | { type: 'REMOVE_BLOCKING_ITEM'; itemId: string }
  | { type: 'ESTIMATE_COMPLETION'; estimatedTime: Date }
  | { type: 'MARK_STEP_COMPLETE'; stepId: string }
  | { type: 'MARK_STEP_FAILED'; stepId: string; error: string };

/**
 * Content Pipeline State Machine
 * Orchestrates the entire content creation pipeline from transcript to published posts
 */
export const contentPipelineStateMachine = createMachine(
  {
    id: 'contentPipeline',
    initial: PipelineState.IDLE,
    context: ({ input }: any) => input,
    
    states: {
      [PipelineState.IDLE]: {
        on: {
          START: {
            target: PipelineState.INITIALIZING,
            actions: ['initializePipeline', 'recordStartTime']
          }
        }
      },
      
      [PipelineState.INITIALIZING]: {
        entry: ['validateTranscript', 'setupPipelineSteps'],
        after: {
          500: PipelineState.CLEANING_TRANSCRIPT
        },
        on: {
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.CLEANING_TRANSCRIPT]: {
        entry: ['startTranscriptCleaning', 'updateCurrentStep'],
        on: {
          TRANSCRIPT_CLEANED: {
            target: PipelineState.EXTRACTING_INSIGHTS,
            actions: ['recordCleanedTranscript', 'markStepComplete', 'updateProgress']
          },
          TRANSCRIPT_CLEANING_FAILED: {
            target: PipelineState.FAILED,
            actions: ['recordError', 'markStepFailed']
          },
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.EXTRACTING_INSIGHTS]: {
        entry: ['startInsightExtraction', 'updateCurrentStep'],
        on: {
          INSIGHTS_EXTRACTED: {
            target: PipelineState.REVIEWING_INSIGHTS,
            actions: ['recordExtractedInsights', 'markStepComplete', 'updateProgress'],
            guard: 'hasInsights'
          },
          INSIGHTS_EXTRACTED: {
            target: PipelineState.PARTIALLY_COMPLETED,
            actions: ['recordNoInsights', 'markStepComplete'],
            guard: 'noInsights'
          },
          INSIGHT_EXTRACTION_FAILED: {
            target: PipelineState.FAILED,
            actions: ['recordError', 'markStepFailed']
          },
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.REVIEWING_INSIGHTS]: {
        type: 'parallel',
        states: {
          reviewProcess: {
            initial: 'reviewing',
            states: {
              reviewing: {
                entry: ['addInsightReviewBlockingItems'],
                on: {
                  INSIGHT_APPROVED: {
                    actions: ['approveInsight', 'removeBlockingItem', 'updateProgress']
                  },
                  INSIGHT_REJECTED: {
                    actions: ['rejectInsight', 'removeBlockingItem', 'updateProgress']
                  },
                  ALL_INSIGHTS_REVIEWED: {
                    target: 'reviewComplete',
                    guard: 'allInsightsReviewed'
                  }
                }
              },
              reviewComplete: {
                type: 'final'
              }
            }
          },
          
          autoApproval: {
            initial: 'checking',
            states: {
              checking: {
                always: [
                  {
                    target: 'autoApproving',
                    guard: 'shouldAutoApproveInsights'
                  },
                  {
                    target: 'waiting'
                  }
                ]
              },
              autoApproving: {
                entry: 'autoApproveAllInsights',
                after: {
                  100: 'complete'
                }
              },
              waiting: {
                // Wait for manual review
              },
              complete: {
                type: 'final'
              }
            }
          }
        },
        
        onDone: {
          target: PipelineState.GENERATING_POSTS,
          actions: ['markStepComplete', 'updateProgress']
        },
        
        on: {
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.GENERATING_POSTS]: {
        type: 'parallel',
        states: {
          postGeneration: {
            initial: 'generating',
            states: {
              generating: {
                entry: ['startPostGeneration', 'updateCurrentStep'],
                on: {
                  POSTS_GENERATED: {
                    actions: ['recordGeneratedPosts', 'updateProgress']
                  },
                  POST_GENERATION_FAILED: {
                    actions: ['recordPostGenerationFailure', 'updateProgress']
                  }
                }
              }
            }
          },
          
          progressMonitor: {
            initial: 'monitoring',
            states: {
              monitoring: {
                entry: 'monitorPostGenerationProgress',
                on: {
                  UPDATE_PROGRESS: {
                    actions: 'updateProgress'
                  }
                }
              }
            }
          }
        },
        
        always: {
          target: PipelineState.REVIEWING_POSTS,
          guard: 'allPostsGenerated'
        },
        
        on: {
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.REVIEWING_POSTS]: {
        type: 'parallel',
        states: {
          reviewProcess: {
            initial: 'reviewing',
            states: {
              reviewing: {
                entry: ['addPostReviewBlockingItems'],
                on: {
                  POST_APPROVED: {
                    actions: ['approvePost', 'removeBlockingItem', 'updateProgress']
                  },
                  POST_REJECTED: {
                    actions: ['rejectPost', 'removeBlockingItem', 'updateProgress']
                  },
                  ALL_POSTS_REVIEWED: {
                    target: 'reviewComplete',
                    guard: 'allPostsReviewed'
                  }
                }
              },
              reviewComplete: {
                type: 'final'
              }
            }
          },
          
          autoApproval: {
            initial: 'checking',
            states: {
              checking: {
                always: [
                  {
                    target: 'autoApproving',
                    guard: 'shouldAutoApprovePosts'
                  },
                  {
                    target: 'waiting'
                  }
                ]
              },
              autoApproving: {
                entry: 'autoApproveAllPosts',
                after: {
                  100: 'complete'
                }
              },
              waiting: {
                // Wait for manual review
              },
              complete: {
                type: 'final'
              }
            }
          }
        },
        
        onDone: {
          target: PipelineState.READY_TO_SCHEDULE,
          actions: ['markStepComplete', 'updateProgress']
        },
        
        on: {
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.READY_TO_SCHEDULE]: {
        entry: ['prepareSchedulingData'],
        on: {
          START: {
            target: PipelineState.SCHEDULING
          },
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.SCHEDULING]: {
        entry: ['startScheduling', 'updateCurrentStep'],
        on: {
          POSTS_SCHEDULED: {
            target: PipelineState.COMPLETED,
            actions: ['recordScheduledPosts', 'markStepComplete', 'updateProgress', 'recordCompletionTime']
          },
          SCHEDULING_FAILED: {
            target: PipelineState.FAILED,
            actions: ['recordError', 'markStepFailed']
          },
          PAUSE: {
            target: PipelineState.PAUSED,
            actions: 'recordPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      [PipelineState.COMPLETED]: {
        type: 'final',
        entry: ['calculateFinalMetrics', 'notifyCompletion', 'cleanupResources']
      },
      
      [PipelineState.PARTIALLY_COMPLETED]: {
        entry: ['calculatePartialMetrics', 'notifyPartialCompletion'],
        on: {
          RETRY: {
            target: PipelineState.INITIALIZING,
            guard: 'canRetry',
            actions: 'incrementRetryCount'
          }
        }
      },
      
      [PipelineState.FAILED]: {
        entry: ['recordFailureTime', 'notifyFailure'],
        on: {
          RETRY: {
            target: PipelineState.INITIALIZING,
            guard: 'canRetry',
            actions: 'incrementRetryCount'
          }
        }
      },
      
      [PipelineState.PAUSED]: {
        on: {
          RESUME: {
            target: 'resuming',
            actions: 'clearPauseTime'
          },
          CANCEL: {
            target: PipelineState.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },
      
      resuming: {
        always: [
          { target: PipelineState.CLEANING_TRANSCRIPT, guard: 'wasCleaningTranscript' },
          { target: PipelineState.EXTRACTING_INSIGHTS, guard: 'wasExtractingInsights' },
          { target: PipelineState.REVIEWING_INSIGHTS, guard: 'wasReviewingInsights' },
          { target: PipelineState.GENERATING_POSTS, guard: 'wasGeneratingPosts' },
          { target: PipelineState.REVIEWING_POSTS, guard: 'wasReviewingPosts' },
          { target: PipelineState.SCHEDULING, guard: 'wasScheduling' },
          { target: PipelineState.IDLE }
        ]
      },
      
      [PipelineState.CANCELLED]: {
        type: 'final',
        entry: ['recordCancellationTime', 'cleanupResources', 'notifyCancellation']
      }
    }
  },
  {
    actions: {
      initializePipeline: assign({
        startedAt: () => new Date(),
        progress: 0,
        currentStep: 'initializing'
      }),
      
      recordStartTime: assign({
        startedAt: () => new Date()
      }),
      
      recordPauseTime: assign({
        pausedAt: () => new Date()
      }),
      
      clearPauseTime: assign({
        pausedAt: null
      }),
      
      recordCompletionTime: assign({
        completedAt: () => new Date(),
        actualDuration: ({ context }) => {
          if (!context.startedAt) return null;
          return Date.now() - context.startedAt.getTime();
        }
      }),
      
      recordFailureTime: assign({
        failedAt: () => new Date()
      }),
      
      recordCancellationTime: assign({
        completedAt: () => new Date()
      }),
      
      updateProgress: assign({
        progress: ({ context }) => calculateProgress(context)
      }),
      
      markStepComplete: assign({
        completedSteps: ({ context }) => context.completedSteps + 1,
        successfulSteps: ({ context, event }) => {
          const stepId = (event as any).stepId || context.currentStep;
          return stepId ? [...context.successfulSteps, stepId] : context.successfulSteps;
        }
      }),
      
      markStepFailed: assign({
        failedSteps: ({ context, event }) => {
          const stepId = (event as any).stepId || context.currentStep;
          return stepId ? [...context.failedSteps, stepId] : context.failedSteps;
        }
      }),
      
      recordError: assign({
        lastError: ({ event }) => (event as any).error || 'Unknown error'
      }),
      
      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1
      }),
      
      recordExtractedInsights: assign({
        insightIds: ({ event }) => (event as any).insightIds || [],
        insights: ({ context, event }) => {
          const newInsights = new Map(context.insights);
          const insightIds = (event as any).insightIds || [];
          
          insightIds.forEach((id: string) => {
            newInsights.set(id, {
              insightId: id,
              status: 'pending',
              retryCount: 0
            });
          });
          
          return newInsights;
        }
      }),
      
      recordGeneratedPosts: assign({
        postIds: ({ context, event }) => [...context.postIds, ...((event as any).postIds || [])],
        posts: ({ context, event }) => {
          const newPosts = new Map(context.posts);
          const postIds = (event as any).postIds || [];
          const insightId = (event as any).insightId;
          
          postIds.forEach((id: string) => {
            newPosts.set(id, {
              postId: id,
              insightId,
              platform: 'linkedin', // Will be updated with actual platform
              status: 'pending',
              retryCount: 0
            });
          });
          
          return newPosts;
        }
      }),
      
      approveInsight: assign({
        insights: ({ context, event }) => {
          const newInsights = new Map(context.insights);
          const insightId = (event as any).insightId;
          const current = newInsights.get(insightId);
          
          if (current) {
            newInsights.set(insightId, {
              ...current,
              status: 'approved',
              completedAt: new Date()
            });
          }
          
          return newInsights;
        }
      }),
      
      rejectInsight: assign({
        insights: ({ context, event }) => {
          const newInsights = new Map(context.insights);
          const insightId = (event as any).insightId;
          const current = newInsights.get(insightId);
          
          if (current) {
            newInsights.set(insightId, {
              ...current,
              status: 'rejected',
              completedAt: new Date()
            });
          }
          
          return newInsights;
        }
      }),
      
      approvePost: assign({
        posts: ({ context, event }) => {
          const newPosts = new Map(context.posts);
          const postId = (event as any).postId;
          const current = newPosts.get(postId);
          
          if (current) {
            newPosts.set(postId, {
              ...current,
              status: 'approved',
              completedAt: new Date()
            });
          }
          
          return newPosts;
        }
      }),
      
      rejectPost: assign({
        posts: ({ context, event }) => {
          const newPosts = new Map(context.posts);
          const postId = (event as any).postId;
          const current = newPosts.get(postId);
          
          if (current) {
            newPosts.set(postId, {
              ...current,
              status: 'rejected',
              completedAt: new Date()
            });
          }
          
          return newPosts;
        }
      }),
      
      addInsightReviewBlockingItems: assign({
        blockingItems: ({ context }) => {
          const items: BlockingItem[] = [];
          
          context.insights.forEach((insight, id) => {
            if (insight.status === 'pending' || insight.status === 'extracting') {
              items.push({
                id: `review-insight-${id}`,
                type: 'insight_review',
                entityId: id,
                entityType: 'insight',
                description: `Review required for insight ${id}`,
                priority: 'medium',
                createdAt: new Date()
              });
            }
          });
          
          return [...context.blockingItems, ...items];
        }
      }),
      
      addPostReviewBlockingItems: assign({
        blockingItems: ({ context }) => {
          const items: BlockingItem[] = [];
          
          context.posts.forEach((post, id) => {
            if (post.status === 'pending' || post.status === 'generating') {
              items.push({
                id: `review-post-${id}`,
                type: 'post_review',
                entityId: id,
                entityType: 'post',
                description: `Review required for ${post.platform} post ${id}`,
                priority: 'medium',
                createdAt: new Date()
              });
            }
          });
          
          return [...context.blockingItems, ...items];
        }
      }),
      
      removeBlockingItem: assign({
        blockingItems: ({ context, event }) => {
          const itemId = (event as any).itemId || 
                        `review-insight-${(event as any).insightId}` ||
                        `review-post-${(event as any).postId}`;
          return context.blockingItems.filter(item => item.id !== itemId);
        }
      }),
      
      autoApproveAllInsights: assign({
        insights: ({ context }) => {
          const newInsights = new Map(context.insights);
          
          newInsights.forEach((insight, id) => {
            if (insight.status === 'pending' || insight.status === 'extracting') {
              newInsights.set(id, {
                ...insight,
                status: 'approved',
                completedAt: new Date()
              });
            }
          });
          
          return newInsights;
        },
        blockingItems: ({ context }) => 
          context.blockingItems.filter(item => item.type !== 'insight_review')
      }),
      
      autoApproveAllPosts: assign({
        posts: ({ context }) => {
          const newPosts = new Map(context.posts);
          
          newPosts.forEach((post, id) => {
            if (post.status === 'pending' || post.status === 'generating') {
              newPosts.set(id, {
                ...post,
                status: 'approved',
                completedAt: new Date()
              });
            }
          });
          
          return newPosts;
        },
        blockingItems: ({ context }) => 
          context.blockingItems.filter(item => item.type !== 'post_review')
      })
    },
    
    guards: {
      canRetry: ({ context }) => canRetryPipeline(context),
      
      hasInsights: ({ event }) => {
        const insightIds = (event as any).insightIds;
        return insightIds && insightIds.length > 0;
      },
      
      noInsights: ({ event }) => {
        const insightIds = (event as any).insightIds;
        return !insightIds || insightIds.length === 0;
      },
      
      shouldAutoApproveInsights: ({ context }) => 
        context.options.autoApprove === true || context.options.skipInsightReview === true,
      
      shouldAutoApprovePosts: ({ context }) => 
        context.options.autoApprove === true || context.options.skipPostReview === true,
      
      allInsightsReviewed: ({ context }) => {
        let allReviewed = true;
        context.insights.forEach(insight => {
          if (insight.status === 'pending' || insight.status === 'extracting' || insight.status === 'reviewing') {
            allReviewed = false;
          }
        });
        return allReviewed;
      },
      
      allPostsReviewed: ({ context }) => {
        let allReviewed = true;
        context.posts.forEach(post => {
          if (post.status === 'pending' || post.status === 'generating' || post.status === 'reviewing') {
            allReviewed = false;
          }
        });
        return allReviewed;
      },
      
      allPostsGenerated: ({ context }) => {
        // Check if all approved insights have generated posts
        const approvedInsights = Array.from(context.insights.values())
          .filter(i => i.status === 'approved');
        
        const generatedPostsInsightIds = new Set(
          Array.from(context.posts.values()).map(p => p.insightId)
        );
        
        return approvedInsights.every(insight => 
          generatedPostsInsightIds.has(insight.insightId)
        );
      },
      
      wasCleaningTranscript: ({ context }) => 
        context.currentStep === 'cleaningTranscript',
      
      wasExtractingInsights: ({ context }) => 
        context.currentStep === 'extractingInsights',
      
      wasReviewingInsights: ({ context }) => 
        context.currentStep === 'reviewingInsights',
      
      wasGeneratingPosts: ({ context }) => 
        context.currentStep === 'generatingPosts',
      
      wasReviewingPosts: ({ context }) => 
        context.currentStep === 'reviewingPosts',
      
      wasScheduling: ({ context }) => 
        context.currentStep === 'scheduling'
    }
  }
);

/**
 * Type exports for use in services
 */
export type PipelineStateMachine = typeof contentPipelineStateMachine;
export type PipelineActor = ReturnType<typeof contentPipelineStateMachine['createActor']>;