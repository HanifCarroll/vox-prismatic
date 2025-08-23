import { display } from "@content-creation/content-pipeline";
import { generatePostsWorkflow } from "@content-creation/workflows";
import {
	type AppConfig,
	formatCost,
	formatDuration,
	formatNumber,
} from "@content-creation/shared";

/**
 * CLI Post Generation Module - UI Layer Only
 * Business logic moved to @content-creation/workflows
 */

/**
 * Displays session summary with metrics
 */
const displaySessionSummary = (results: any): void => {
	if (!results || results.metrics.length === 0) {
		return;
	}

	console.log("\n📊 POST GENERATION SESSION SUMMARY");
	display.separator();

	const { summary } = results;

	console.log(
		`📈 Results: ${summary.successful} successful, ${summary.failed} failed`,
	);
	console.log(`⏱️  Total Duration: ${formatDuration(summary.totalDuration)}`);
	console.log(`🪙 Total Tokens Used: ${formatNumber(summary.totalTokens)}`);
	console.log(`💰 Total Estimated Cost: ${formatCost(summary.totalCost)}`);

	if (summary.successful > 0) {
		const avgDuration = summary.totalDuration / summary.successful;
		const avgCost = summary.totalCost / summary.successful;
		console.log(
			`📊 Averages per post: ${formatDuration(avgDuration)}, ${formatCost(avgCost)}`,
		);
	}

	// Log failed insights if any
	const failedMetrics = results.metrics.filter((m: any) => !m.success);
	if (failedMetrics.length > 0) {
		console.log("\n⚠️ Failed insights:");
		failedMetrics.forEach((metrics: any) => {
			console.log(`  • ${metrics.insightTitle}: ${metrics.error}`);
		});
	}

	console.log(`💾 Saved post generation session summary to debug/`);
};

/**
 * Main post generator function - Now just UI orchestration
 */
export const runPostGenerator = async (
	config: AppConfig,
	batchSize: number = 3,
): Promise<void> => {
	try {
		display.info("Starting post generation from insights...");

		// Call the pure business logic workflow
		const result = await generatePostsWorkflow(config, { 
			batchSize,
			enableDebugSaving: true 
		});
		
		if (!result.success) {
			throw result.error;
		}

		const { data: results } = result;

		if (results.metrics.length === 0) {
			display.success('No insights found with status "Ready for Posts"');
			return;
		}

		console.log(
			`📊 Found ${results.metrics.length} insight${results.metrics.length === 1 ? "" : "s"} for post generation`,
		);

		console.log(`\n⚡ Processing ${batchSize} insights in parallel`);

		// Display session summary
		displaySessionSummary(results);

		display.success("Post generation completed!");
	} catch (error) {
		display.error(`Fatal error in post generation: ${error}`);
		throw error;
	}
};