import { getDatabase } from './connection';
import { Result } from '@content-creation/shared';

/**
 * Transcript data access layer
 * Handles raw transcripts from desktop app recordings
 */

export interface TranscriptRecord {
  id: string;
  title: string;
  content: string;
  status: 'raw' | 'processing' | 'cleaned' | 'error';
  sourceType: 'recording' | 'upload' | 'manual';
  durationSeconds?: number;
  filePath?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTranscriptData {
  title: string;
  content: string;
  sourceType?: 'recording' | 'upload' | 'manual';
  durationSeconds?: number;
  filePath?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate unique ID for transcripts
 */
const generateTranscriptId = (): string => {
  return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert database row to TranscriptRecord
 */
const fromDbRow = (row: any): TranscriptRecord => ({
  id: row.id,
  title: row.title,
  content: row.content,
  status: row.status,
  sourceType: row.source_type,
  durationSeconds: row.duration_seconds,
  filePath: row.file_path,
  metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Create a new transcript
 */
export const createTranscript = (data: CreateTranscriptData): Result<TranscriptRecord> => {
  try {
    const db = getDatabase();
    const id = generateTranscriptId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO transcripts (
        id, title, content, source_type, duration_seconds, 
        file_path, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.title,
      data.content,
      data.sourceType || 'manual',
      data.durationSeconds || null,
      data.filePath || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now
    );

    const transcript: TranscriptRecord = {
      id,
      title: data.title,
      content: data.content,
      status: 'raw',
      sourceType: data.sourceType || 'manual',
      durationSeconds: data.durationSeconds,
      filePath: data.filePath,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now
    };

    console.log(`📝 Transcript created: ${id} - "${data.title}"`);

    return {
      success: true,
      data: transcript
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get transcript by ID
 */
export const getTranscript = (id: string): Result<TranscriptRecord> => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transcripts WHERE id = ?');
    const row = stmt.get(id);

    if (!row) {
      return {
        success: false,
        error: new Error(`Transcript not found: ${id}`)
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
 * Get all transcripts with optional filtering
 */
export const getTranscripts = (filters?: {
  status?: 'raw' | 'processing' | 'cleaned' | 'error';
  sourceType?: 'recording' | 'upload' | 'manual';
  limit?: number;
  offset?: number;
}): Result<TranscriptRecord[]> => {
  try {
    const db = getDatabase();
    
    let query = 'SELECT * FROM transcripts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.sourceType) {
      conditions.push('source_type = ?');
      params.push(filters.sourceType);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

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

    const transcripts = rows.map(fromDbRow);

    return {
      success: true,
      data: transcripts
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Update transcript status
 */
export const updateTranscriptStatus = (
  id: string, 
  status: 'raw' | 'processing' | 'cleaned' | 'error'
): Result<void> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE transcripts 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);

    const result = stmt.run(status, now, id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Transcript not found: ${id}`)
      };
    }

    console.log(`📊 Transcript ${id} status updated to: ${status}`);

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
 * Update transcript content (for editing)
 */
export const updateTranscript = (
  id: string,
  updates: {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
  }
): Result<TranscriptRecord> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setParts: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (updates.title !== undefined) {
      setParts.push('title = ?');
      params.push(updates.title);
    }

    if (updates.content !== undefined) {
      setParts.push('content = ?');
      params.push(updates.content);
    }

    if (updates.metadata !== undefined) {
      setParts.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE transcripts 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Transcript not found: ${id}`)
      };
    }

    // Get updated transcript
    const getResult = getTranscript(id);
    if (!getResult.success) {
      return getResult;
    }

    console.log(`📝 Transcript updated: ${id}`);

    return {
      success: true,
      data: getResult.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete transcript
 */
export const deleteTranscript = (id: string): Result<void> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM transcripts WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Transcript not found: ${id}`)
      };
    }

    console.log(`🗑️ Transcript deleted: ${id}`);

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
 * Search transcripts by content
 */
export const searchTranscripts = (
  searchTerm: string,
  limit: number = 20
): Result<TranscriptRecord[]> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM transcripts 
      WHERE title LIKE ? OR content LIKE ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const searchPattern = `%${searchTerm}%`;
    const rows = stmt.all(searchPattern, searchPattern, limit);
    
    const transcripts = rows.map(fromDbRow);

    return {
      success: true,
      data: transcripts
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get transcript statistics
 */
export const getTranscriptStats = () => {
  try {
    const db = getDatabase();
    
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM transcripts');
    const total = totalStmt.get() as { count: number };

    const statusStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM transcripts 
      GROUP BY status
    `);
    const byStatus = statusStmt.all() as { status: string; count: number }[];

    const sourceStmt = db.prepare(`
      SELECT source_type, COUNT(*) as count 
      FROM transcripts 
      GROUP BY source_type
    `);
    const bySource = sourceStmt.all() as { source_type: string; count: number }[];

    const durationStmt = db.prepare(`
      SELECT 
        AVG(duration_seconds) as avg_duration,
        SUM(duration_seconds) as total_duration
      FROM transcripts 
      WHERE duration_seconds IS NOT NULL
    `);
    const duration = durationStmt.get() as { avg_duration: number; total_duration: number };

    return {
      success: true,
      data: {
        total: total.count,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        bySource: bySource.reduce((acc, item) => {
          acc[item.source_type] = item.count;
          return acc;
        }, {} as Record<string, number>),
        averageDuration: duration.avg_duration || 0,
        totalDuration: duration.total_duration || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};