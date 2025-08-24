# @content-creation/x

Direct X/Twitter API integration for the content creation platform. Provides functional interfaces for X posting, scheduling, and analytics following the same patterns as the Postiz and LinkedIn packages.

## Setup

1. Add X API credentials to your configuration:

```typescript
interface XConfig {
  apiKey: string;          // Consumer Key from Twitter Developer Portal
  apiSecret: string;       // Consumer Secret from Twitter Developer Portal
  clientId: string;        // OAuth 2.0 Client ID (for v2 API)
  clientSecret: string;    // OAuth 2.0 Client Secret (for v2 API)  
  accessToken?: string;    // User's access token
  refreshToken?: string;   // User's refresh token
  tokenSecret?: string;    // For OAuth 1.1 (media uploads)
}
```

2. OAuth Flow (one-time setup):

```typescript
import { generateAuthUrl, exchangeCodeForToken } from '@content-creation/x';

// Step 1: Generate auth URL
const authUrl = generateAuthUrl(config, 'random-state');
console.log('Visit:', authUrl);

// Step 2: After user authorizes, exchange code for token
const tokenResult = await exchangeCodeForToken(config, authCode);
if (tokenResult.success) {
  // Store tokenResult.data.access_token and refresh_token
  config.accessToken = tokenResult.data.access_token;
  config.refreshToken = tokenResult.data.refresh_token;
}
```

## Usage

### Basic Tweeting

```typescript
import { createXClient, createTweet } from '@content-creation/x';

// Create authenticated client
const clientResult = await createXClient(config);
if (!clientResult.success) {
  throw new Error('Authentication failed');
}

const client = clientResult.data;

// Post tweet immediately
const tweetResult = await createTweet(client, "Hello X! 🐦");
if (tweetResult.success) {
  console.log('Tweet created:', tweetResult.data.id);
}
```

### Tweet Threads

```typescript
import { createThread, createPostOrThread } from '@content-creation/x';

// Create thread manually
const tweets = [
  "This is the first tweet in the thread 🧵",
  "This is the second tweet, continuing the thought...",
  "And this concludes our thread! Thanks for reading 📚"
];

const threadResult = await createThread(client, tweets);

// Or automatically split long content into thread
const longContent = "Your very long post content that exceeds 280 characters...";
const result = await createPostOrThread(client, longContent);
```

### Advanced Tweet Options

```typescript
// Reply to a tweet
const replyResult = await createTweet(client, "Great point!", {
  replyTo: "1234567890123456789"
});

// Quote tweet
const quoteResult = await createTweet(client, "Adding my thoughts:", {
  quoteTweetId: "1234567890123456789"
});

// Tweet with media (requires media upload first)
const mediaResult = await createTweet(client, "Check out this image!", {
  mediaIds: ["media_id_from_upload"]
});
```

### Postiz-Compatible Interface

```typescript
import { schedulePostToPlatform } from '@content-creation/x';

// Works just like Postiz and LinkedIn packages
const result = await schedulePostToPlatform(
  config,
  "Your tweet content here",
  "2024-12-25T10:00:00Z" // Optional: for future scheduling
);
```

### Get User Data

```typescript
import { getTweets, getProfile } from '@content-creation/x';

// Get user profile
const profile = await getProfile(client);
console.log(`Hello @${profile.data.username}!`);

// Get recent tweets
const tweets = await getTweets(client, 20);
console.log(`Found ${tweets.data.length} tweets`);

// Get tweet analytics
import { getTweetAnalytics } from '@content-creation/x';
const analytics = await getTweetAnalytics(client, tweetId);
console.log(`Likes: ${analytics.data.likes}, Retweets: ${analytics.data.retweets}`);
```

## API Features & Limitations

### ✅ Supported Features
- **Tweet Creation**: Text tweets up to 280 characters
- **Thread Creation**: Automatic and manual thread creation
- **Tweet Deletion**: Remove your tweets
- **Reply & Quote**: Reply to tweets and quote tweets
- **Basic Analytics**: Likes, retweets, replies, impressions
- **User Profile**: Get authenticated user information

### ⚠️ Limitations
- **No Native Scheduling**: X API doesn't support scheduling. Use our shared scheduler or post immediately.
- **Media Uploads**: Requires separate implementation using Twitter API v1.1
- **Rate Limits**: X API has strict rate limits (varies by endpoint and plan)
- **Advanced Analytics**: Full metrics require additional API access/permissions

### 🔄 Rate Limits (Twitter API v2)
- **Tweet Creation**: 300 tweets per 15-minute window
- **Tweet Deletion**: 300 deletes per 15-minute window  
- **User Profile**: 75 requests per 15-minute window
- **User Tweets**: 900 requests per 15-minute window

## Integration with Existing System

This package follows the same functional patterns as your other packages:

- Same `Result<T>` return types
- Same error handling patterns  
- Same logging and console output
- Compatible with existing scheduler UI

You can easily switch between platforms:

```typescript
// From Postiz
import { schedulePostToPlatform } from '@content-creation/postiz';

// To LinkedIn  
import { schedulePostToPlatform } from '@content-creation/linkedin';

// To X
import { schedulePostToPlatform } from '@content-creation/x';
```

## Thread Handling

The X package includes intelligent thread handling:

```typescript
// Automatically creates thread if content is too long
const result = await createPostOrThread(client, longContent);

// Manual thread creation with custom split points
const tweets = splitIntoTweets(content, customBreakpoints);
const threadResult = await createThread(client, tweets);
```

Perfect for your content creation pipeline where AI-generated posts might exceed tweet limits!