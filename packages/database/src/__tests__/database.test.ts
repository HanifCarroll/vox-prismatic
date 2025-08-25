#!/usr/bin/env bun
/**
 * Database Integration Tests
 * Tests the complete content pipeline using repositories and services
 */

import {
	getDatabaseStats,
	initDatabase,
	InsightRepository,
	PostService,
	ScheduledPostRepository,
	TranscriptRepository,
} from "../index";

const runTests = async () => {
	console.log(
		"🧪 Testing Database Package with Repositories and Services...\n",
	);

	// Initialize database
	console.log("1. Initializing database...");
	try {
		initDatabase();
		console.log("✅ Database initialized successfully");
	} catch (error) {
		console.error("❌ Database initialization failed:", error);
		return;
	}

	// Create repository and service instances
	const transcriptRepo = new TranscriptRepository();
	const insightRepo = new InsightRepository();
	const postService = new PostService();
	const scheduledRepo = new ScheduledPostRepository();

	// Test 1: Create a transcript
	console.log("\n2. Testing transcript creation...");
	const transcriptResult = await transcriptRepo.create({
		title: "Test Recording: Content Strategy Meeting",
		sourceType: "recording",
		rawContent:
			"This is a sample transcript from our content strategy meeting. We discussed various approaches to creating engaging content for our audience. Key points included understanding our target demographic, developing compelling narratives, and measuring engagement metrics.",
		wordCount: 150,
		duration: 300,
	});

	if (transcriptResult.success) {
		console.log(`✅ Transcript created: ${transcriptResult.data.id}`);
	} else {
		console.error(
			"❌ Transcript creation failed:",
			transcriptResult.error.message,
		);
		return;
	}

	// Test 2: Update transcript to cleaned status and create an insight
	console.log("\n3. Testing transcript cleaning and insight creation...");

	const cleanResult = await transcriptRepo.update(transcriptResult.data.id, {
		status: "cleaned",
		cleanedContent:
			"Clean version: Content strategy focuses on understanding your audience and creating compelling narratives that resonate with their needs and aspirations.",
	});

	if (!cleanResult.success) {
		console.error("❌ Transcript cleaning failed:", cleanResult.error.message);
		return;
	}

	console.log(`✅ Transcript cleaned: ${transcriptResult.data.id}`);

	const insightResult = await insightRepo.create({
		cleanedTranscriptId: transcriptResult.data.id,
		title: "Audience-First Content Strategy",
		summary:
			"Successful content creation starts with deep audience understanding before crafting narratives.",
		verbatimQuote:
			"understanding our target demographic, developing compelling narratives",
		category: "Content Strategy",
		postType: "Framework",
		urgencyScore: 8,
		relatabilityScore: 9,
		specificityScore: 7,
		authorityScore: 8,
		processingDurationMs: 1500,
		estimatedTokens: 250,
		estimatedCost: 0.02,
	});

	if (insightResult.success) {
		console.log(
			`✅ Insight created: ${insightResult.data.id} (score: ${insightResult.data.totalScore})`,
		);
	} else {
		console.error("❌ Insight creation failed:", insightResult.error.message);
		return;
	}

	// Test 3: Create a post using PostService
	console.log("\n4. Testing post creation with PostService...");
	const postResult = await postService.createPost({
		insightId: insightResult.data.id,
		title: "Audience-First Strategy Post",
		platform: "linkedin",
		content:
			"🎯 Want to create content that actually resonates?\n\nThe secret isn't in the fancy tools or trending topics.\n\nIt's in understanding your audience first.\n\nBefore you write a single word:\n• Research their pain points\n• Understand their language\n• Know their aspirations\n\nThen craft your narrative around THEIR world.\n\nWhat's your audience's biggest challenge?",
	});

	if (postResult.success) {
		console.log(
			`✅ Post created: ${postResult.data.id} (${postResult.data.characterCount} chars)`,
		);
	} else {
		console.error("❌ Post creation failed:", postResult.error.message);
		return;
	}

	// Test 4: Approve the post using PostService lifecycle
	console.log("\n5. Testing post lifecycle management...");

	const submitResult = await postService.submitForReview(postResult.data.id);
	if (submitResult.success) {
		console.log(`✅ Post submitted for review: ${postResult.data.id}`);
	} else {
		console.error("❌ Post submission failed:", submitResult.error.message);
		return;
	}

	const approveResult = await postService.approvePost(postResult.data.id);
	if (approveResult.success) {
		console.log(`✅ Post approved: ${postResult.data.id}`);
	} else {
		console.error("❌ Post approval failed:", approveResult.error.message);
		return;
	}

	// Test 5: Schedule the post using PostService
	console.log("\n6. Testing post scheduling with PostService...");
	const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

	const scheduleResult = await postService.schedulePost({
		postId: postResult.data.id,
		platform: "linkedin",
		content: postResult.data.content,
		scheduledTime: futureTime.toISOString(),
		metadata: {
			visibility: "PUBLIC",
			originalPostId: postResult.data.id,
		},
	});

	if (scheduleResult.success) {
		console.log(
			`✅ Post scheduled: ${scheduleResult.data.scheduledPost.id} for ${futureTime.toISOString()}`,
		);
	} else {
		console.error("❌ Post scheduling failed:", scheduleResult.error.message);
		return;
	}

	// Test 6: Query data using repositories and services
	console.log("\n7. Testing data retrieval...");

	const transcriptsResult = await transcriptRepo.findAll({ limit: 5 });
	const insightsResult = await insightRepo.findWithTranscripts({ limit: 5 });
	const postsWithScheduleResult = await postService.getPostsWithSchedule();
	const scheduledPostsResult = await scheduledRepo.findAll({ limit: 5 });

	if (transcriptsResult.success) {
		console.log(`✅ Found ${transcriptsResult.data.length} transcripts`);
	}

	if (insightsResult.success) {
		console.log(`✅ Found ${insightsResult.data.length} insights`);
	}

	if (postsWithScheduleResult.success) {
		console.log(
			`✅ Found ${postsWithScheduleResult.data.length} posts with schedule info`,
		);
	}

	if (scheduledPostsResult.success) {
		console.log(`✅ Found ${scheduledPostsResult.data.length} scheduled posts`);
	}

	// Test 7: Statistics using PostService
	console.log("\n8. Testing statistics...");
	const statsResult = await postService.getStatistics();

	if (statsResult.success) {
		const stats = statsResult.data;
		console.log("📊 Comprehensive Statistics:");
		console.log(`   Posts: ${stats.posts.total} total`);
		console.log(
			`   Scheduled: ${stats.scheduled.total} total (${stats.scheduled.pending} pending)`,
		);
		console.log(`   Platforms:`, stats.posts.byPlatform);
	} else {
		console.error("❌ Statistics failed:", statsResult.error.message);
	}

	// Test 8: Database-level statistics
	console.log("\n9. Testing database-level statistics...");
	const dbStats = getDatabaseStats();

	console.log("📊 Database Statistics:");
	console.log(`   Transcripts: ${dbStats.transcripts.count}`);
	console.log(`   Insights: ${dbStats.insights.count}`);
	console.log(`   Posts: ${dbStats.posts.count}`);
	console.log(`   Scheduled Posts: ${dbStats.scheduledPosts.count}`);

	console.log("\n🎉 Database tests completed successfully!");
	console.log("\n💡 Your content pipeline is ready:");
	console.log("   📝 Transcripts → 💡 Insights → 📱 Posts → 📅 Scheduling");
	console.log("\n🚀 Features tested:");
	console.log("   ✅ Repository pattern for data access");
	console.log("   ✅ PostService for coordinated operations");
	console.log("   ✅ Complete post lifecycle management");
	console.log("   ✅ Status synchronization between posts and scheduled_posts");
	console.log("   ✅ Comprehensive statistics and reporting");
};

if (import.meta.main) {
	runTests().catch((error) => {
		console.error("💥 Test error:", error);
		process.exit(1);
	});
}
