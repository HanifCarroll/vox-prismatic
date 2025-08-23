import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Analytics tracking system for review decisions
 */

export interface ReviewDecision {
  id: string;
  title: string;
  action: 'approved' | 'rejected' | 'edited' | 'skipped' | 'regenerated';
  timestamp: string;
  sessionId: string;
  metadata?: {
    platform?: string;
    score?: number;
    postType?: string;
    sourceInsightId?: string;
    editReason?: string;
    regenerationPrompt?: string;
  };
}

export interface ReviewSession {
  sessionId: string;
  type: 'insight' | 'post';
  startTime: string;
  endTime?: string;
  totalReviewed: number;
  decisions: ReviewDecision[];
  summary: {
    approved: number;
    rejected: number;
    edited: number;
    skipped: number;
    regenerated: number;
  };
}

export interface AnalyticsData {
  lastUpdated: string;
  totalSessions: number;
  insights: {
    totalReviewed: number;
    totalApproved: number;
    totalRejected: number;
    totalSkipped: number;
    approvedIds: string[];
    rejectedIds: string[];
    skippedIds: string[];
  };
  posts: {
    totalReviewed: number;
    totalApproved: number;
    totalRejected: number;
    totalEdited: number;
    totalSkipped: number;
    totalRegenerated: number;
    approvedIds: string[];
    rejectedIds: string[];
    editedIds: string[];
    skippedIds: string[];
    regeneratedIds: string[];
  };
  sessions: ReviewSession[];
}

const ANALYTICS_FILE_PATH = join(process.cwd(), 'data', 'review-analytics.json');
const DATA_DIR = join(process.cwd(), 'data');

/**
 * Ensures the data directory exists
 */
const ensureDataDirectory = (): void => {
  if (!existsSync(DATA_DIR)) {
    const fs = require('fs');
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

/**
 * Loads existing analytics data or creates initial structure
 */
export const loadAnalyticsData = (): AnalyticsData => {
  ensureDataDirectory();
  
  if (!existsSync(ANALYTICS_FILE_PATH)) {
    const initialData: AnalyticsData = {
      lastUpdated: new Date().toISOString(),
      totalSessions: 0,
      insights: {
        totalReviewed: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalSkipped: 0,
        approvedIds: [],
        rejectedIds: [],
        skippedIds: []
      },
      posts: {
        totalReviewed: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalEdited: 0,
        totalSkipped: 0,
        totalRegenerated: 0,
        approvedIds: [],
        rejectedIds: [],
        editedIds: [],
        skippedIds: [],
        regeneratedIds: []
      },
      sessions: []
    };
    saveAnalyticsData(initialData);
    return initialData;
  }

  try {
    const data = readFileSync(ANALYTICS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading analytics data:', error);
    return loadAnalyticsData(); // Return fresh data if corrupted
  }
};

/**
 * Saves analytics data to file
 */
export const saveAnalyticsData = (data: AnalyticsData): void => {
  try {
    data.lastUpdated = new Date().toISOString();
    writeFileSync(ANALYTICS_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving analytics data:', error);
  }
};

/**
 * Creates a new review session
 */
export const createReviewSession = (type: 'insight' | 'post'): string => {
  const sessionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return sessionId;
};

/**
 * Records a review decision
 */
export const recordReviewDecision = (
  sessionId: string,
  type: 'insight' | 'post',
  decision: Omit<ReviewDecision, 'sessionId'>
): void => {
  const analytics = loadAnalyticsData();
  
  const reviewDecision: ReviewDecision = {
    ...decision,
    sessionId
  };

  // Find or create session
  let session = analytics.sessions.find(s => s.sessionId === sessionId);
  if (!session) {
    session = {
      sessionId,
      type,
      startTime: new Date().toISOString(),
      totalReviewed: 0,
      decisions: [],
      summary: {
        approved: 0,
        rejected: 0,
        edited: 0,
        skipped: 0,
        regenerated: 0
      }
    };
    analytics.sessions.push(session);
  }

  // Add decision to session
  session.decisions.push(reviewDecision);
  session.totalReviewed++;
  session.summary[decision.action]++;

  // Update global stats
  if (type === 'insight') {
    analytics.insights.totalReviewed++;
    switch (decision.action) {
      case 'approved':
        analytics.insights.totalApproved++;
        analytics.insights.approvedIds.push(decision.id);
        break;
      case 'rejected':
        analytics.insights.totalRejected++;
        analytics.insights.rejectedIds.push(decision.id);
        break;
      case 'skipped':
        analytics.insights.totalSkipped++;
        analytics.insights.skippedIds.push(decision.id);
        break;
    }
  } else if (type === 'post') {
    analytics.posts.totalReviewed++;
    switch (decision.action) {
      case 'approved':
        analytics.posts.totalApproved++;
        analytics.posts.approvedIds.push(decision.id);
        break;
      case 'rejected':
        analytics.posts.totalRejected++;
        analytics.posts.rejectedIds.push(decision.id);
        break;
      case 'edited':
        analytics.posts.totalEdited++;
        analytics.posts.editedIds.push(decision.id);
        break;
      case 'skipped':
        analytics.posts.totalSkipped++;
        analytics.posts.skippedIds.push(decision.id);
        break;
      case 'regenerated':
        analytics.posts.totalRegenerated++;
        analytics.posts.regeneratedIds.push(decision.id);
        break;
    }
  }

  saveAnalyticsData(analytics);
};

/**
 * Ends a review session
 */
export const endReviewSession = (sessionId: string): void => {
  const analytics = loadAnalyticsData();
  const session = analytics.sessions.find(s => s.sessionId === sessionId);
  
  if (session) {
    session.endTime = new Date().toISOString();
    analytics.totalSessions++;
    saveAnalyticsData(analytics);
  }
};

/**
 * Gets analytics summary for display
 */
export const getAnalyticsSummary = (): {
  insights: { approved: number; rejected: number; skipped: number; total: number };
  posts: { approved: number; rejected: number; edited: number; skipped: number; regenerated: number; total: number };
  sessions: number;
} => {
  const analytics = loadAnalyticsData();
  
  return {
    insights: {
      approved: analytics.insights.totalApproved,
      rejected: analytics.insights.totalRejected,
      skipped: analytics.insights.totalSkipped,
      total: analytics.insights.totalReviewed
    },
    posts: {
      approved: analytics.posts.totalApproved,
      rejected: analytics.posts.totalRejected,
      edited: analytics.posts.totalEdited,
      skipped: analytics.posts.totalSkipped,
      regenerated: analytics.posts.totalRegenerated,
      total: analytics.posts.totalReviewed
    },
    sessions: analytics.totalSessions
  };
};

/**
 * Gets IDs for analysis
 */
export const getAnalysisIds = (): {
  insights: { approved: string[]; rejected: string[]; skipped: string[] };
  posts: { approved: string[]; rejected: string[]; edited: string[]; skipped: string[]; regenerated: string[] };
} => {
  const analytics = loadAnalyticsData();
  
  return {
    insights: {
      approved: analytics.insights.approvedIds,
      rejected: analytics.insights.rejectedIds,
      skipped: analytics.insights.skippedIds
    },
    posts: {
      approved: analytics.posts.approvedIds,
      rejected: analytics.posts.rejectedIds,
      edited: analytics.posts.editedIds,
      skipped: analytics.posts.skippedIds,
      regenerated: analytics.posts.regeneratedIds
    }
  };
};

/**
 * Displays analytics summary to console
 */
export const displayAnalytics = (): void => {
  const summary = getAnalyticsSummary();
  
  console.log('\n📊 REVIEW ANALYTICS SUMMARY');
  console.log('═'.repeat(50));
  
  console.log('\n💡 INSIGHTS:');
  console.log(`   Total Reviewed: ${summary.insights.total}`);
  console.log(`   ✅ Approved: ${summary.insights.approved} (${summary.insights.total > 0 ? Math.round((summary.insights.approved / summary.insights.total) * 100) : 0}%)`);
  console.log(`   ❌ Rejected: ${summary.insights.rejected} (${summary.insights.total > 0 ? Math.round((summary.insights.rejected / summary.insights.total) * 100) : 0}%)`);
  console.log(`   ⏭️  Skipped: ${summary.insights.skipped} (${summary.insights.total > 0 ? Math.round((summary.insights.skipped / summary.insights.total) * 100) : 0}%)`);
  
  console.log('\n📝 POSTS:');
  console.log(`   Total Reviewed: ${summary.posts.total}`);
  console.log(`   ✅ Approved: ${summary.posts.approved} (${summary.posts.total > 0 ? Math.round((summary.posts.approved / summary.posts.total) * 100) : 0}%)`);
  console.log(`   📝 Edited: ${summary.posts.edited} (${summary.posts.total > 0 ? Math.round((summary.posts.edited / summary.posts.total) * 100) : 0}%)`);
  console.log(`   🔄 Regenerated: ${summary.posts.regenerated} (${summary.posts.total > 0 ? Math.round((summary.posts.regenerated / summary.posts.total) * 100) : 0}%)`);
  console.log(`   ❌ Rejected: ${summary.posts.rejected} (${summary.posts.total > 0 ? Math.round((summary.posts.rejected / summary.posts.total) * 100) : 0}%)`);
  console.log(`   ⏭️  Skipped: ${summary.posts.skipped} (${summary.posts.total > 0 ? Math.round((summary.posts.skipped / summary.posts.total) * 100) : 0}%)`);
  
  console.log(`\n🎯 Total Sessions: ${summary.sessions}`);
  console.log('═'.repeat(50));
};

/**
 * Displays analytics for a specific type (insights or posts)
 */
export const displayTypeAnalytics = (type: 'insights' | 'posts'): void => {
  const summary = getAnalyticsSummary();
  const data = type === 'insights' ? summary.insights : summary.posts;
  
  console.clear();
  console.log(`📊 ${type.toUpperCase()} ANALYTICS`);
  console.log('═'.repeat(40));
  
  if (data.total === 0) {
    console.log(`\nNo ${type} have been reviewed yet.`);
    console.log('Start reviewing to see analytics here!\n');
    return;
  }
  
  console.log(`\n📈 Total Reviewed: ${data.total}`);
  console.log('─'.repeat(40));
  
  if (type === 'insights') {
    console.log(`✅ Approved: ${data.approved} (${Math.round((data.approved / data.total) * 100)}%)`);
    console.log(`❌ Rejected: ${(data as any).rejected} (${Math.round(((data as any).rejected / data.total) * 100)}%)`);
    console.log(`⏭️  Skipped: ${(data as any).skipped} (${Math.round(((data as any).skipped / data.total) * 100)}%)`);
  } else {
    console.log(`✅ Approved: ${data.approved} (${Math.round((data.approved / data.total) * 100)}%)`);
    console.log(`📝 Edited: ${(data as any).edited} (${Math.round(((data as any).edited / data.total) * 100)}%)`);
    console.log(`🔄 Regenerated: ${(data as any).regenerated} (${Math.round(((data as any).regenerated / data.total) * 100)}%)`);
    console.log(`❌ Rejected: ${(data as any).rejected} (${Math.round(((data as any).rejected / data.total) * 100)}%)`);
    console.log(`⏭️  Skipped: ${(data as any).skipped} (${Math.round(((data as any).skipped / data.total) * 100)}%)`);
  }
  
  console.log('═'.repeat(40));
  console.log('\n💡 This data helps improve AI generation quality!');
  console.log('   Higher approval rates indicate better AI performance.\n');
};