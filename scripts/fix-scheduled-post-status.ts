#!/usr/bin/env bun

/**
 * Script to fix post statuses for posts that are scheduled but still show as "approved"
 */

import { PrismaClient } from "../apps/api-hono/src/database/prisma/generated";

const prisma = new PrismaClient();

async function fixScheduledPostStatuses() {
	console.log(
		"🔍 Finding posts that are scheduled but still marked as approved...",
	);

	try {
		// Find all pending scheduled posts
		const scheduledPosts = await prisma.scheduledPost.findMany({
			where: {
				status: "pending",
			},
			include: {
				post: true,
			},
		});

		let fixedCount = 0;

		for (const scheduledPost of scheduledPosts) {
			if (scheduledPost.post.status === "approved") {
				console.log(
					`\n📋 Found mismatched status for post ${scheduledPost.postId}:`,
				);
				console.log(`  - Post Title: ${scheduledPost.post.title}`);
				console.log(
					`  - Post Status: ${scheduledPost.post.status} (should be "scheduled")`,
				);
				console.log(`  - Scheduled for: ${scheduledPost.scheduledTime}`);
				console.log(`  - Platform: ${scheduledPost.platform}`);

				// Update the post status to "scheduled"
				await prisma.post.update({
					where: { id: scheduledPost.postId },
					data: {
						status: "scheduled",
						updatedAt: new Date().toISOString(),
					},
				});

				console.log(`  ✅ Fixed: Updated status to "scheduled"`);
				fixedCount++;
			}
		}

		if (fixedCount > 0) {
			console.log(`\n✅ Fixed ${fixedCount} post status mismatches`);
		} else {
			console.log("\n✅ All scheduled posts have correct status");
		}
	} catch (error) {
		console.error("❌ Error fixing post statuses:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the fix
fixScheduledPostStatuses();
