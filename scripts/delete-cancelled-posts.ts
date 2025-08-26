#!/usr/bin/env bun

/**
 * Script to delete all cancelled scheduled posts from the database
 * Since we're removing the concept of "cancelled" status entirely
 */

import { PrismaClient } from "../apps/api-hono/src/database/prisma/generated";

const prisma = new PrismaClient();

async function deleteCancelledPosts() {
	console.log("🔍 Finding cancelled scheduled posts to delete...");

	try {
		// Find all cancelled scheduled posts
		const cancelledPosts = await prisma.scheduledPost.findMany({
			where: {
				status: "cancelled",
			},
		});

		if (cancelledPosts.length === 0) {
			console.log("✅ No cancelled posts found");
			return;
		}

		console.log(`Found ${cancelledPosts.length} cancelled posts to delete:`);
		cancelledPosts.forEach((post) => {
			console.log(
				`  - ID: ${post.id}, PostID: ${post.postId}, Platform: ${post.platform}, Time: ${post.scheduledTime}`,
			);
		});

		// Delete all cancelled posts
		const result = await prisma.scheduledPost.deleteMany({
			where: {
				status: "cancelled",
			},
		});

		console.log(`\n✅ Deleted ${result.count} cancelled scheduled posts`);
	} catch (error) {
		console.error("❌ Error deleting cancelled posts:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the cleanup
deleteCancelledPosts();
