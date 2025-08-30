import { useMemo } from "react";

interface DashboardCounts {
  transcripts: {
    total: number;
    byStatus: Record<string, number>;
  };
  insights: {
    total: number;
    byStatus: Record<string, number>;
  };
  posts: {
    total: number;
    byStatus: Record<string, number>;
  };
}

interface TranscriptView {
  id: string;
  status: string;
}

interface InsightView {
  id: string;
  status: string;
  category: string;
}

interface PostView {
  id: string;
  status: string;
}

export function useContentCounts(
  transcripts: TranscriptView[],
  insights: InsightView[],
  posts: PostView[],
  dashboardCounts?: DashboardCounts | null
) {
  return useMemo(() => {
    if (!dashboardCounts) {
      // Fallback to calculating from paginated data if dashboard counts aren't loaded yet
      const transcriptCounts = {
        total: transcripts.length,
        raw: transcripts.filter(t => t.status === "raw").length,
        cleaned: transcripts.filter(t => t.status === "cleaned").length,
      };

      const insightCounts = {
        total: insights.length,
        needsReview: insights.filter(i => i.status === "needs_review").length,
        approved: insights.filter(i => i.status === "approved").length,
        rejected: insights.filter(i => i.status === "rejected").length,
      };

      const postCounts = {
        total: posts.length,
        needsReview: posts.filter(p => p.status === "needs_review").length,
        approved: posts.filter(p => p.status === "approved").length,
        scheduled: posts.filter(p => p.status === "scheduled").length,
        published: posts.filter(p => p.status === "published").length,
      };

      return { transcripts: transcriptCounts, insights: insightCounts, posts: postCounts };
    }

    // Use accurate dashboard counts
    const transcriptCounts = {
      total: dashboardCounts.transcripts.total,
      raw: dashboardCounts.transcripts.byStatus.raw || 0,
      cleaned: dashboardCounts.transcripts.byStatus.cleaned || 0,
    };

    const insightCounts = {
      total: dashboardCounts.insights.total,
      needsReview: dashboardCounts.insights.byStatus.needs_review || 0,
      approved: dashboardCounts.insights.byStatus.approved || 0,
      rejected: dashboardCounts.insights.byStatus.rejected || 0,
    };

    const postCounts = {
      total: dashboardCounts.posts.total,
      needsReview: dashboardCounts.posts.byStatus.needs_review || 0,
      approved: dashboardCounts.posts.byStatus.approved || 0,
      scheduled: dashboardCounts.posts.byStatus.scheduled || 0,
      published: dashboardCounts.posts.byStatus.published || 0,
    };

    return { transcripts: transcriptCounts, insights: insightCounts, posts: postCounts };
  }, [transcripts, insights, posts, dashboardCounts]);
}