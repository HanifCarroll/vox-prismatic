/**
 * Insight Server Actions
 * Centralized exports for all insight operations
 */

// Read operations
export {
  getInsights,
  getInsight
} from './read.actions';

// Write operations
export {
  updateInsight,
  deleteInsight,
  bulkUpdateInsights
} from './write.actions';

// Processing operations
export {
  approveInsight,
  rejectInsight,
  generatePostsFromInsight
} from './processing.actions';