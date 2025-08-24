import { 
  XTweet, 
  XTweetData, 
  XProfile, 
  XAnalytics,
  Result 
} from '@content-creation/shared';
import { XClient } from './auth';

/**
 * X/Twitter Posts API implementation
 * Based on Twitter API v2 documentation
 */

/**
 * Get authenticated user's profile
 */
export const getProfile = async (client: XClient): Promise<Result<XProfile>> => {
  try {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified,public_metrics', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'User-Agent': 'ContentCreationBot/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`X API error: ${response.status} ${errorData}`)
      };
    }

    const responseData = await response.json();
    const userData = responseData.data;
    
    const profile: XProfile = {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      profileImageUrl: userData.profile_image_url,
      verified: userData.verified || false,
      followersCount: userData.public_metrics?.followers_count || 0,
      followingCount: userData.public_metrics?.following_count || 0
    };

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Create a tweet
 */
export const createTweet = async (
  client: XClient,
  tweetData: XTweetData
): Promise<Result<XTweet>> => {
  try {
    // Create tweet request body according to Twitter API v2
    const requestBody: any = {
      text: tweetData.text
    };

    // Add optional fields if provided
    if (tweetData.replyTo) {
      requestBody.reply = {
        in_reply_to_tweet_id: tweetData.replyTo
      };
    }

    if (tweetData.quoteTweetId) {
      requestBody.quote_tweet_id = tweetData.quoteTweetId;
    }

    if (tweetData.mediaIds && tweetData.mediaIds.length > 0) {
      requestBody.media = {
        media_ids: tweetData.mediaIds
      };
    }

    if (tweetData.pollOptions && tweetData.pollOptions.length > 0) {
      requestBody.poll = {
        options: tweetData.pollOptions,
        duration_minutes: 1440 // 24 hours default
      };
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ContentCreationBot/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`X tweet creation failed: ${response.status} ${errorData}`)
      };
    }

    const responseData = await response.json();
    const tweetInfo = responseData.data;
    
    // Transform response to our XTweet interface
    const tweet: XTweet = {
      id: tweetInfo.id,
      text: tweetInfo.text,
      createdAt: new Date().toISOString(),
      authorId: '', // Will be filled by profile data if needed
    };

    return {
      success: true,
      data: tweet
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete a tweet
 */
export const deleteTweet = async (
  client: XClient,
  tweetId: string
): Promise<Result<void>> => {
  try {
    const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'User-Agent': 'ContentCreationBot/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`X tweet deletion failed: ${response.status} ${errorData}`)
      };
    }

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
 * Get user's tweets
 */
export const getTweets = async (
  client: XClient,
  maxResults: number = 10
): Promise<Result<XTweet[]>> => {
  try {
    // Get user profile first to get user ID
    const profileResult = await getProfile(client);
    if (!profileResult.success) {
      return profileResult;
    }

    const userId = profileResult.data.id;
    
    const response = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics,context_annotations,entities`, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'User-Agent': 'ContentCreationBot/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`X tweets fetch failed: ${response.status} ${errorData}`)
      };
    }

    const responseData = await response.json();
    const tweets: XTweet[] = responseData.data?.map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      authorId: userId,
      publicMetrics: tweet.public_metrics ? {
        retweetCount: tweet.public_metrics.retweet_count || 0,
        likeCount: tweet.public_metrics.like_count || 0,
        replyCount: tweet.public_metrics.reply_count || 0,
        quoteCount: tweet.public_metrics.quote_count || 0
      } : undefined,
      contextAnnotations: tweet.context_annotations,
      entities: tweet.entities
    })) || [];

    return {
      success: true,
      data: tweets
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Create a thread (multiple tweets)
 */
export const createThread = async (
  client: XClient,
  tweets: string[]
): Promise<Result<XTweet[]>> => {
  try {
    const results: XTweet[] = [];
    let replyToId: string | undefined;

    for (const [index, tweetText] of tweets.entries()) {
      const tweetData: XTweetData = {
        text: tweetText,
        replyTo: replyToId
      };

      const result = await createTweet(client, tweetData);
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Failed to post tweet ${index + 1}: ${result.error.message}`)
        };
      }

      results.push(result.data);
      replyToId = result.data.id;

      // Add delay between tweets to avoid rate limits
      if (index < tweets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get tweet analytics (basic implementation)
 * Note: Full analytics require Twitter API v1.1 or special permissions
 */
export const getTweetAnalytics = async (
  client: XClient,
  tweetId: string
): Promise<Result<XAnalytics>> => {
  try {
    // Get tweet with public metrics
    const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'User-Agent': 'ContentCreationBot/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`X tweet analytics fetch failed: ${response.status} ${errorData}`)
      };
    }

    const responseData = await response.json();
    const tweet = responseData.data;
    const metrics = tweet.public_metrics || {};
    
    const analytics: XAnalytics = {
      tweetId,
      impressions: metrics.impression_count || 0,
      engagements: (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0) + (metrics.quote_count || 0),
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
      engagementRate: metrics.impression_count > 0 
        ? ((metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0) + (metrics.quote_count || 0)) / metrics.impression_count * 100
        : 0
    };

    return {
      success: true,
      data: analytics
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};