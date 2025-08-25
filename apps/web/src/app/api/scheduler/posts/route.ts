import { tryGetConfig } from "@content-creation/config";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Get posts ready for scheduling
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const config = tryGetConfig();

		if (!config) {
			return NextResponse.json(
				{
					success: false,
					error: "Configuration not available",
				},
				{ status: 500 },
			);
		}

		const notionClient = createNotionClient(config.notion);

		// Get posts ready to schedule
		const result = await posts.getReadyToSchedule(notionClient, config.notion);

		if (!result.success) {
			return NextResponse.json(
				{
					success: false,
					error: result.error.message,
				},
				{ status: 500 },
			);
		}

		// Add content preview for each post
		const postsWithContent = await Promise.all(
			result.data.map(async (post) => {
				try {
					const response = await notionClient.blocks.children.list({
						block_id: post.id,
						page_size: 10,
					});

					let content = "";
					for (const block of response.results) {
						const fullBlock = block as any;
						if (
							fullBlock.type === "paragraph" &&
							fullBlock.paragraph?.rich_text
						) {
							const text = fullBlock.paragraph.rich_text
								.map((rt: any) => rt.plain_text)
								.join("");
							content += text + " ";
							if (content.length > 500) break;
						}
					}

					return {
						...post,
						content: content.trim() || "No content available",
					};
				} catch (error) {
					return {
						...post,
						content: "Failed to load content",
					};
				}
			}),
		);

		return NextResponse.json({
			success: true,
			data: postsWithContent,
		});
	} catch (error) {
		console.error("Error fetching posts for scheduling:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch posts",
			},
			{ status: 500 },
		);
	}
}
