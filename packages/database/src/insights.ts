import { getDatabase } from './connection';
import { Result, PostType } from '@content-creation/shared';

/**
 * Insights data access layer
 * Handles AI-extracted insights from cleaned transcripts
 */

export interface InsightRecord {
  id: string;
  cleanedTranscriptId: string;
  title: string;
  summary: string;
  verbatimQuote: string;
  category: string;
  postType: PostType;
  
  // Scoring
  urgencyScore: number;
  relatabilityScore: number;
  specificityScore: number;
  authorityScore: number;
  totalScore: number;
  
  status: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';
  
  // Processing metadata
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsightData {
  cleanedTranscriptId: string;
  title: string;
  summary: string;
  verbatimQuote: string;
  category: string;
  postType: PostType;
  urgencyScore: number;
  relatabilityScore: number;
  specificityScore: number;
  authorityScore: number;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
}

/**
 * Generate unique ID for insights
 */
const generateInsightId = (): string => {
  return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert database row to InsightRecord
 */
const fromDbRow = (row: any): InsightRecord => ({
  id: row.id,
  cleanedTranscriptId: row.cleaned_transcript_id,
  title: row.title,
  summary: row.summary,
  verbatimQuote: row.verbatim_quote,
  category: row.category,
  postType: row.post_type as PostType,
  urgencyScore: row.urgency_score,
  relatabilityScore: row.relatability_score,
  specificityScore: row.specificity_score,
  authorityScore: row.authority_score,
  totalScore: row.total_score,
  status: row.status,
  processingDurationMs: row.processing_duration_ms,
  estimatedTokens: row.estimated_tokens,
  estimatedCost: row.estimated_cost,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Create a new insight
 */
export const createInsight = (data: CreateInsightData): Result<InsightRecord> => {
  try {
    const db = getDatabase();
    const id = generateInsightId();
    const now = new Date().toISOString();

    // Validate scores
    const scores = [data.urgencyScore, data.relatabilityScore, data.specificityScore, data.authorityScore];
    if (scores.some(score => score < 1 || score > 10)) {
      return {
        success: false,
        error: new Error('All scores must be between 1 and 10')
      };
    }

    const stmt = db.prepare(`
      INSERT INTO insights (
        id, cleaned_transcript_id, title, summary, verbatim_quote, 
        category, post_type, urgency_score, relatability_score, 
        specificity_score, authority_score, processing_duration_ms,
        estimated_tokens, estimated_cost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.cleanedTranscriptId,
      data.title,
      data.summary,
      data.verbatimQuote,
      data.category,
      data.postType,
      data.urgencyScore,
      data.relatabilityScore,
      data.specificityScore,
      data.authorityScore,
      data.processingDurationMs || null,
      data.estimatedTokens || null,
      data.estimatedCost || null,
      now,
      now
    );

    const totalScore = data.urgencyScore + data.relatabilityScore + data.specificityScore + data.authorityScore;

    const insight: InsightRecord = {
      id,
      cleanedTranscriptId: data.cleanedTranscriptId,
      title: data.title,
      summary: data.summary,
      verbatimQuote: data.verbatimQuote,
      category: data.category,
      postType: data.postType,
      urgencyScore: data.urgencyScore,
      relatabilityScore: data.relatabilityScore,
      specificityScore: data.specificityScore,
      authorityScore: data.authorityScore,
      totalScore,
      status: 'draft',
      processingDurationMs: data.processingDurationMs,
      estimatedTokens: data.estimatedTokens,
      estimatedCost: data.estimatedCost,
      createdAt: now,
      updatedAt: now
    };

    console.log(`💡 Insight created: ${id} - "${data.title}" (score: ${totalScore})`);

    return {
      success: true,
      data: insight
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get insight by ID
 */
export const getInsight = (id: string): Result<InsightRecord> => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM insights WHERE id = ?');
    const row = stmt.get(id);

    if (!row) {
      return {
        success: false,
        error: new Error(`Insight not found: ${id}`)
      };
    }

    return {
      success: true,
      data: fromDbRow(row)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get insights with filtering and sorting
 */
export const getInsights = (filters?: {
  cleanedTranscriptId?: string;
  status?: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';
  category?: string;
  postType?: PostType;
  minScore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'total_score' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}): Result<InsightRecord[]> => {
  try {
    const db = getDatabase();
    
    let query = 'SELECT * FROM insights';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.cleanedTranscriptId) {
      conditions.push('cleaned_transcript_id = ?');
      params.push(filters.cleanedTranscriptId);
    }

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters?.postType) {
      conditions.push('post_type = ?');
      params.push(filters.postType);
    }

    if (filters?.minScore) {
      conditions.push('total_score >= ?');
      params.push(filters.minScore);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const sortBy = filters?.sortBy || 'total_score';
    const sortOrder = filters?.sortOrder || 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    const insights = rows.map(fromDbRow);

    return {
      success: true,
      data: insights
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Update insight status
 */
export const updateInsightStatus = (
  id: string, 
  status: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived'
): Result<void> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE insights 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);

    const result = stmt.run(status, now, id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Insight not found: ${id}`)
      };
    }

    console.log(`📊 Insight ${id} status updated to: ${status}`);

    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Bulk update insight statuses
 */
export const bulkUpdateInsightStatus = (
  ids: string[],
  status: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived'
): Result<number> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE insights 
      SET status = ?, updated_at = ? 
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(status, now, ...ids);
    
    console.log(`📊 ${result.changes} insights updated to status: ${status}`);

    return {
      success: true,
      data: result.changes as number
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get insights ready for review (high scoring drafts)
 */
export const getInsightsNeedingReview = (minScore: number = 20): Result<InsightRecord[]> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM insights 
      WHERE status = 'draft' AND total_score >= ?
      ORDER BY total_score DESC
    `);

    const rows = stmt.all(minScore);
    const insights = rows.map(fromDbRow);

    return {
      success: true,
      data: insights
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get approved insights ready for post generation
 */
export const getApprovedInsights = (): Result<InsightRecord[]> => {
  return getInsights({ 
    status: 'approved',
    sortBy: 'total_score',
    sortOrder: 'DESC'
  });
};

/**
 * Search insights
 */
export const searchInsights = (
  searchTerm: string,
  limit: number = 20
): Result<InsightRecord[]> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM insights 
      WHERE title LIKE ? OR summary LIKE ? OR verbatim_quote LIKE ? 
      ORDER BY total_score DESC 
      LIMIT ?
    `);

    const searchPattern = `%${searchTerm}%`;
    const rows = stmt.all(searchPattern, searchPattern, searchPattern, limit);
    
    const insights = rows.map(fromDbRow);

    return {
      success: true,
      data: insights
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get insight statistics
 */
export const getInsightStats = () => {
  try {
    const db = getDatabase();
    
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM insights');
    const total = totalStmt.get() as { count: number };

    const statusStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM insights 
      GROUP BY status
    `);
    const byStatus = statusStmt.all() as { status: string; count: number }[];

    const categoryStmt = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM insights 
      GROUP BY category
      ORDER BY count DESC
    `);
    const byCategory = categoryStmt.all() as { category: string; count: number }[];

    const postTypeStmt = db.prepare(`
      SELECT post_type, COUNT(*) as count 
      FROM insights 
      GROUP BY post_type
      ORDER BY count DESC
    `);
    const byPostType = postTypeStmt.all() as { post_type: string; count: number }[];

    const scoresStmt = db.prepare(`
      SELECT 
        AVG(total_score) as avg_total_score,
        AVG(urgency_score) as avg_urgency,
        AVG(relatability_score) as avg_relatability,
        AVG(specificity_score) as avg_specificity,
        AVG(authority_score) as avg_authority,
        MAX(total_score) as max_score,
        MIN(total_score) as min_score
      FROM insights
    `);
    const scores = scoresStmt.get() as any;

    const topInsightsStmt = db.prepare(`
      SELECT id, title, total_score 
      FROM insights 
      ORDER BY total_score DESC 
      LIMIT 10
    `);
    const topInsights = topInsightsStmt.all() as { id: string; title: string; total_score: number }[];

    return {
      success: true,
      data: {
        total: total.count,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byCategory: byCategory.slice(0, 10), // Top 10 categories
        byPostType: byPostType.reduce((acc, item) => {
          acc[item.post_type] = item.count;
          return acc;
        }, {} as Record<string, number>),
        averageScores: {
          total: Math.round(scores.avg_total_score || 0),
          urgency: Math.round((scores.avg_urgency || 0) * 10) / 10,
          relatability: Math.round((scores.avg_relatability || 0) * 10) / 10,
          specificity: Math.round((scores.avg_specificity || 0) * 10) / 10,
          authority: Math.round((scores.avg_authority || 0) * 10) / 10
        },
        scoreRange: {
          max: scores.max_score || 0,
          min: scores.min_score || 0
        },
        topInsights
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete insight
 */
export const deleteInsight = (id: string): Result<void> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM insights WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Insight not found: ${id}`)
      };
    }

    console.log(`🗑️ Insight deleted: ${id}`);

    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};