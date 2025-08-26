import { 
  XProfile, 
  XTweet, 
  XTweetData,
  XAnalytics,
  XMediaUpload,
  Result 
} from '../types/social-media';
import { XClient } from './auth';

/**
 * X (Twitter) API functions for tweets and profile management
 */

/**
 * Get authenticated user's X profile
 */
export const getProfile = async (client: XClient): Promise<Result<XProfile>> => {
  try {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X API error: ${errorData.detail || response.statusText}`)
      };
    }

    const responseData = await response.json();
    const userData = responseData.data;

    const profile: XProfile = {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      profile_image_url: userData.profile_image_url,
      public_metrics: userData.public_metrics
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
    const payload: any = {
      text: tweetData.text
    };

    // Add optional fields
    if (tweetData.replyTo) {
      payload.reply = { in_reply_to_tweet_id: tweetData.replyTo };
    }

    if (tweetData.quoteTweetId) {
      payload.quote_tweet_id = tweetData.quoteTweetId;
    }

    if (tweetData.mediaIds && tweetData.mediaIds.length > 0) {
      payload.media = { media_ids: tweetData.mediaIds };
    }

    if (tweetData.poll) {
      payload.poll = {
        options: tweetData.poll.options,
        duration_minutes: tweetData.poll.duration_minutes
      };
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X tweet creation error: ${errorData.detail || errorData.title || response.statusText}`)
      };
    }

    const responseData = await response.json();
    const tweetInfo = responseData.data;

    const tweet: XTweet = {
      id: tweetInfo.id,
      text: tweetInfo.text,
      created_at: new Date().toISOString(),
      author_id: client.config.clientId // Will be updated when we get user info
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
 * Create a thread (multiple connected tweets)
 */
export const createThread = async (
  client: XClient,
  tweets: string[]
): Promise<Result<XTweet[]>> => {
  try {
    const createdTweets: XTweet[] = [];
    let replyToId: string | undefined;

    for (const [index, tweetText] of tweets.entries()) {
      const tweetData: XTweetData = {
        text: tweetText,
        replyTo: replyToId
      };

      const result = await createTweet(client, tweetData);
      if (!result.success) {
        return result;
      }

      createdTweets.push(result.data);
      replyToId = result.data.id;

      // Add a small delay between tweets to avoid rate limiting
      if (index < tweets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      data: createdTweets
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
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X tweet deletion error: ${errorData.detail || response.statusText}`)
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
  userId?: string,
  maxResults: number = 20
): Promise<Result<XTweet[]>> => {
  try {
    let endpoint = 'https://api.twitter.com/2/tweets';
    
    if (userId) {
      endpoint = `https://api.twitter.com/2/users/${userId}/tweets`;
    } else {
      // Get current user's tweets
      const profileResult = await getProfile(client);
      if (!profileResult.success) {
        return profileResult;
      }
      endpoint = `https://api.twitter.com/2/users/${profileResult.data.id}/tweets`;
    }

    const params = new URLSearchParams({
      'tweet.fields': 'created_at,author_id,public_metrics,referenced_tweets',
      'max_results': Math.min(maxResults, 100).toString()
    });

    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X tweets fetch error: ${errorData.detail || response.statusText}`)
      };
    }

    const responseData = await response.json();
    const tweetsData = responseData.data || [];

    const tweets: XTweet[] = tweetsData.map((tweetData: any) => ({
      id: tweetData.id,
      text: tweetData.text,
      created_at: tweetData.created_at,
      author_id: tweetData.author_id,
      public_metrics: tweetData.public_metrics,
      referenced_tweets: tweetData.referenced_tweets
    }));

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
 * Upload media for use in tweets
 */
export const uploadMedia = async (
  client: XClient,
  mediaData: Buffer,
  mediaType: string
): Promise<Result<XMediaUpload>> => {
  try {
    // X media upload requires multipart/form-data
    const formData = new FormData();
    formData.append('media', new Blob([mediaData], { type: mediaType }));

    const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X media upload error: ${errorData.error || response.statusText}`)
      };
    }

    const mediaInfo = await response.json();

    const media: XMediaUpload = {
      media_id: mediaInfo.media_id,
      media_id_string: mediaInfo.media_id_string,
      media_key: mediaInfo.media_key,
      size: mediaInfo.size,
      expires_after_secs: mediaInfo.expires_after_secs
    };

    return {
      success: true,
      data: media
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get tweet analytics (if available)
 */
export const getTweetAnalytics = async (
  client: XClient,
  tweetId: string
): Promise<Result<XAnalytics>> => {
  try {
    // X analytics require special permissions and are limited
    // For now, return basic structure with zeros
    const analytics: XAnalytics = {
      tweetId,
      impressions: 0,
      url_link_clicks: 0,
      user_profile_clicks: 0,
      likes: 0,
      replies: 0,
      retweets: 0
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