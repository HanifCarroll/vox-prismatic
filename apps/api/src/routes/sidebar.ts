import { Hono } from 'hono';
import { InsightRepository } from '../database/repositories/insight-repository';
import { PostRepository } from '../database/repositories/post-repository';

const sidebar = new Hono();

// Sidebar counts interface matching frontend expectations
interface SidebarCounts {
  insights: number;
  posts: number;
}

// GET /sidebar/counts - Get sidebar badge counts
sidebar.get('/counts', async (c) => {
  try {
    const insightRepo = new InsightRepository();
    const postRepo = new PostRepository();

    // Get insights that need review (status: 'extracted')
    const insightsResult = await insightRepo.findAll({ status: 'extracted' });
    const insightsCount = insightsResult.success ? insightsResult.data.length : 0;

    // Get posts that need review (status: 'draft') 
    const postsResult = await postRepo.findAll({ status: 'draft' });
    const postsCount = postsResult.success ? postsResult.data.length : 0;

    const counts: SidebarCounts = {
      insights: insightsCount,
      posts: postsCount
    };

    return c.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Failed to get sidebar counts:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sidebar counts'
      },
      500
    );
  }
});

export default sidebar;