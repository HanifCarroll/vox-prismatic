import { count, desc, eq } from "drizzle-orm";
import type { Result, TranscriptView } from "../index";
import {
	type NewTranscript,
	type Transcript,
	transcripts as transcriptsTable,
} from "../schema";
import type { StatsResult, TranscriptFilter } from "../types/filters";
import { BaseRepository } from "./base-repository";

/**
 * TranscriptRepository - Handle all transcript data operations
 * Replaces direct database access in API routes
 */
export class TranscriptRepository extends BaseRepository {
	/**
	 * Convert database transcript to TranscriptView format
	 */
	private convertToView(transcript: Transcript): TranscriptView {
		return {
			id: transcript.id,
			title: transcript.title,
			status: transcript.status as TranscriptView["status"],
			sourceType:
				(transcript.sourceType as TranscriptView["sourceType"]) || "upload",
			sourceUrl: transcript.sourceUrl || undefined,
			fileName: transcript.fileName || undefined,
			rawContent: transcript.rawContent || transcript.cleanedContent || "",
			cleanedContent: transcript.cleanedContent || undefined,
			wordCount: transcript.wordCount || 0,
			duration: transcript.duration || undefined,
			createdAt: new Date(transcript.createdAt),
			updatedAt: new Date(transcript.updatedAt),
		};
	}

	/**
	 * Find all transcripts with filtering and pagination
	 */
	async findAll(filters?: TranscriptFilter): Promise<Result<TranscriptView[]>> {
		return this.execute(async () => {
			// For now, use a simple query approach and filter in memory
			// This avoids the complex Drizzle TypeScript issues
			const dbTranscripts = await this.db
				.select()
				.from(transcriptsTable)
				.orderBy(desc(transcriptsTable.createdAt));

			// Convert to view format
			let transcriptViews = dbTranscripts.map(this.convertToView);

			// Apply filters in memory
			if (filters?.status && filters.status !== "all") {
				if (filters.status === "processing") {
					transcriptViews = transcriptViews.filter(
						(t) => t.status === "processing",
					);
				} else {
					transcriptViews = transcriptViews.filter(
						(t) => t.status === filters.status,
					);
				}
			}

			if (filters?.sourceType) {
				transcriptViews = transcriptViews.filter(
					(t) => t.sourceType === filters.sourceType,
				);
			}

			if (filters?.search) {
				const searchQuery = filters.search.toLowerCase();
				transcriptViews = transcriptViews.filter(
					(t) =>
						t.title.toLowerCase().includes(searchQuery) ||
						t.rawContent.toLowerCase().includes(searchQuery),
				);
			}

			// Apply pagination
			if (filters?.offset) {
				transcriptViews = transcriptViews.slice(filters.offset);
			}

			if (filters?.limit) {
				transcriptViews = transcriptViews.slice(0, filters.limit);
			}

			return transcriptViews;
		}, "Failed to fetch transcripts");
	}

	/**
	 * Find transcript by ID
	 */
	async findById(id: string): Promise<Result<TranscriptView | null>> {
		return this.execute(async () => {
			const [transcript] = await this.db
				.select()
				.from(transcriptsTable)
				.where(eq(transcriptsTable.id, id))
				.limit(1);

			return transcript ? this.convertToView(transcript) : null;
		}, `Failed to fetch transcript ${id}`);
	}

	/**
	 * Create new transcript
	 */
	async create(
		data: Partial<NewTranscript> & { title: string; rawContent: string },
	): Promise<Result<TranscriptView>> {
		return this.execute(async () => {
			const now = this.now();
			const id = this.generateId("transcript");

			const newTranscriptData: NewTranscript = {
				id,
				title: data.title,
				rawContent: data.rawContent,
				status: "raw",
				sourceType: data.sourceType || "manual",
				sourceUrl: data.sourceUrl || null,
				fileName: data.fileName || null,
				duration: data.duration || null,
				wordCount: data.rawContent.split(" ").filter((word) => word.length > 0)
					.length,
				createdAt: now,
				updatedAt: now,
			};

			await this.db.insert(transcriptsTable).values(newTranscriptData);

			console.log(`📝 Created transcript: ${id} - "${data.title}"`);

			return this.convertToView(newTranscriptData as Transcript);
		}, "Failed to create transcript");
	}

	/**
	 * Update transcript
	 */
	async update(
		id: string,
		data: Partial<NewTranscript>,
	): Promise<Result<TranscriptView>> {
		return this.execute(async () => {
			const updateData: any = {
				...data,
				updatedAt: this.now(),
			};

			// Recalculate word count if rawContent is updated
			if (data.rawContent) {
				updateData.wordCount = data.rawContent
					.split(" ")
					.filter((word) => word.length > 0).length;
			}

			await this.db
				.update(transcriptsTable)
				.set(updateData)
				.where(eq(transcriptsTable.id, id));

			// Fetch updated transcript
			const [updatedTranscript] = await this.db
				.select()
				.from(transcriptsTable)
				.where(eq(transcriptsTable.id, id))
				.limit(1);

			if (!updatedTranscript) {
				throw new Error(`Transcript not found: ${id}`);
			}

			console.log(`📝 Updated transcript: ${id}`);
			return this.convertToView(updatedTranscript);
		}, `Failed to update transcript ${id}`);
	}

	/**
	 * Update transcript status
	 */
	async updateStatus(
		id: string,
		status: Transcript["status"],
	): Promise<Result<void>> {
		return this.execute(async () => {
			const result = await this.db
				.update(transcriptsTable)
				.set({
					status,
					updatedAt: this.now(),
				})
				.where(eq(transcriptsTable.id, id));

			// Note: bun:sqlite doesn't provide changes count - trusting operation succeeded

			console.log(`📊 Transcript ${id} status updated to: ${status}`);
		}, `Failed to update transcript status for ${id}`);
	}

	/**
	 * Get transcript statistics for dashboard
	 */
	async getStats(): Promise<Result<StatsResult>> {
		return this.execute(async () => {
			// Get total count
			const [totalResult] = await this.db
				.select({ count: count() })
				.from(transcriptsTable);

			const total = totalResult?.count || 0;

			// Get counts by status using raw SQLite connection for GROUP BY
			const statusResults = this.sqlite
				.prepare(
					"SELECT status, COUNT(*) as count FROM transcripts GROUP BY status",
				)
				.all() as { status: string; count: number }[];

			const byStatus: Record<string, number> = {};
			for (const row of statusResults) {
				byStatus[row.status] = Number(row.count);
			}

			return {
				total,
				byStatus,
			};
		}, "Failed to get transcript statistics");
	}

	/**
	 * Delete transcript
	 */
	async delete(id: string): Promise<Result<void>> {
		return this.execute(async () => {
			const result = await this.db
				.delete(transcriptsTable)
				.where(eq(transcriptsTable.id, id));

			// Note: bun:sqlite doesn't provide changes count - trusting operation succeeded

			console.log(`🗑️ Deleted transcript: ${id}`);
		}, `Failed to delete transcript ${id}`);
	}
}
