#!/usr/bin/env bun

/**
 * Migration script to move data from SQLite to PostgreSQL
 * This handles date format conversions and data type transformations
 */

import Database from "better-sqlite3";
import path from "path";
import { PrismaClient } from "../apps/api-hono/src/database/prisma/generated";

const sqlitePath = path.join(process.cwd(), "data", "content.db");
console.log("📂 SQLite database path:", sqlitePath);

// Initialize PostgreSQL client (make sure PostgreSQL is running)
const prisma = new PrismaClient();

// Initialize SQLite connection
const sqlite = new Database(sqlitePath, { readonly: true });

async function migrateData() {
	try {
		console.log("\n🚀 Starting migration from SQLite to PostgreSQL...\n");

		// Helper function to convert dates
		const convertDate = (dateValue: any): Date | null => {
			if (!dateValue) return null;

			// Handle Unix timestamps
			if (typeof dateValue === "number" || /^\d{10,13}$/.test(dateValue)) {
				const timestamp =
					typeof dateValue === "number" ? dateValue : parseInt(dateValue);
				return new Date(timestamp);
			}

			// Handle ISO strings
			try {
				const date = new Date(dateValue);
				return isNaN(date.getTime()) ? null : date;
			} catch {
				return null;
			}
		};

		// 1. Migrate Transcripts
		console.log("📝 Migrating transcripts...");
		const transcripts = sqlite.prepare("SELECT * FROM transcripts").all();

		for (const transcript of transcripts) {
			await prisma.transcript.create({
				data: {
					id: transcript.id,
					title: transcript.title,
					rawContent: transcript.raw_content,
					cleanedContent: transcript.cleaned_content,
					status: transcript.status || "raw",
					sourceType: transcript.source_type,
					sourceUrl: transcript.source_url,
					fileName: transcript.file_name,
					duration: transcript.duration,
					wordCount: transcript.word_count || 0,
					filePath: transcript.file_path,
					createdAt: convertDate(transcript.created_at) || new Date(),
					updatedAt: convertDate(transcript.updated_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${transcripts.length} transcripts`);

		// 2. Migrate Insights
		console.log("\n🔍 Migrating insights...");
		const insights = sqlite.prepare("SELECT * FROM insights").all();

		for (const insight of insights) {
			await prisma.insight.create({
				data: {
					id: insight.id,
					cleanedTranscriptId: insight.cleaned_transcript_id,
					title: insight.title,
					summary: insight.summary,
					verbatimQuote: insight.verbatim_quote,
					category: insight.category,
					postType: insight.post_type,
					urgencyScore: insight.urgency_score,
					relatabilityScore: insight.relatability_score,
					specificityScore: insight.specificity_score,
					authorityScore: insight.authority_score,
					totalScore: insight.total_score,
					status: insight.status || "draft",
					processingDurationMs: insight.processing_duration_ms,
					estimatedTokens: insight.estimated_tokens,
					estimatedCost: insight.estimated_cost,
					createdAt: convertDate(insight.created_at) || new Date(),
					updatedAt: convertDate(insight.updated_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${insights.length} insights`);

		// 3. Migrate Posts
		console.log("\n📮 Migrating posts...");
		const posts = sqlite.prepare("SELECT * FROM posts").all();

		for (const post of posts) {
			await prisma.post.create({
				data: {
					id: post.id,
					insightId: post.insight_id,
					title: post.title,
					platform: post.platform,
					content: post.content,
					status: post.status || "draft",
					characterCount: post.character_count || 0,
					createdAt: convertDate(post.created_at) || new Date(),
					updatedAt: convertDate(post.updated_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${posts.length} posts`);

		// 4. Migrate Scheduled Posts
		console.log("\n📅 Migrating scheduled posts...");
		const scheduledPosts = sqlite
			.prepare('SELECT * FROM scheduled_posts WHERE status != "cancelled"')
			.all();

		for (const sp of scheduledPosts) {
			const scheduledTime = convertDate(sp.scheduled_time);
			if (!scheduledTime) {
				console.log(
					`  ⚠️  Skipping scheduled post ${sp.id} - invalid scheduled time`,
				);
				continue;
			}

			await prisma.scheduledPost.create({
				data: {
					id: sp.id,
					postId: sp.post_id,
					platform: sp.platform,
					content: sp.content,
					scheduledTime: scheduledTime,
					status: sp.status || "pending",
					retryCount: sp.retry_count || 0,
					lastAttempt: convertDate(sp.last_attempt),
					errorMessage: sp.error_message,
					externalPostId: sp.external_post_id,
					createdAt: convertDate(sp.created_at) || new Date(),
					updatedAt: convertDate(sp.updated_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${scheduledPosts.length} scheduled posts`);

		// 5. Migrate Processing Jobs
		console.log("\n⚙️  Migrating processing jobs...");
		const jobs = sqlite.prepare("SELECT * FROM processing_jobs").all();

		for (const job of jobs) {
			await prisma.processingJob.create({
				data: {
					id: job.id,
					status: job.status,
					type: job.type,
					entityId: job.entity_id,
					entityType: job.entity_type,
					retryCount: job.retry_count || 0,
					lastError: job.last_error,
					result: job.result,
					startedAt: convertDate(job.started_at),
					completedAt: convertDate(job.completed_at),
					createdAt: convertDate(job.created_at) || new Date(),
					updatedAt: convertDate(job.updated_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${jobs.length} processing jobs`);

		// 6. Migrate Settings
		console.log("\n⚙️  Migrating settings...");
		const settings = sqlite.prepare("SELECT * FROM settings").all();

		for (const setting of settings) {
			await prisma.setting.create({
				data: {
					id: setting.id,
					key: setting.key,
					value: setting.value,
					description: setting.description,
					createdAt: convertDate(setting.created_at) || new Date(),
					updatedAt: convertDate(setting.updated_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${settings.length} settings`);

		// 7. Migrate Analytics Events
		console.log("\n📊 Migrating analytics events...");
		const events = sqlite.prepare("SELECT * FROM analytics_events").all();

		for (const event of events) {
			await prisma.analyticsEvent.create({
				data: {
					id: event.id,
					eventType: event.event_type,
					entityType: event.entity_type,
					entityId: event.entity_id,
					eventData: event.event_data,
					value: event.value,
					occurredAt: convertDate(event.occurred_at) || new Date(),
					createdAt: convertDate(event.created_at) || new Date(),
				},
			});
		}
		console.log(`  ✅ Migrated ${events.length} analytics events`);

		console.log("\n✅ Migration completed successfully!");
		console.log("\n📌 Next steps:");
		console.log("  1. Verify the data in PostgreSQL");
		console.log("  2. Update your application to use PostgreSQL");
		console.log("  3. Test all functionality");
		console.log("  4. Back up the SQLite database before deleting");
	} catch (error) {
		console.error("\n❌ Migration failed:", error);
		console.error("\n💡 Make sure:");
		console.error("  - PostgreSQL is running (docker compose up postgres)");
		console.error("  - Database is created (content_creation)");
		console.error("  - Prisma schema is migrated (bun prisma migrate dev)");
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		sqlite.close();
	}
}

// Run migration
migrateData();
