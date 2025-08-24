# @content-creation/linkedin

Direct LinkedIn API integration for the content creation platform. Provides functional interfaces for LinkedIn posting, scheduling, and analytics following the same patterns as the Postiz package.

## Setup

1. Add LinkedIn credentials to your configuration:

```typescript
interface LinkedInConfig {
  clientId: string;        // From LinkedIn Developer App
  clientSecret: string;    // From LinkedIn Developer App  
  redirectUri: string;     // Your OAuth redirect URL
  accessToken?: string;    // User's access token
  refreshToken?: string;   // User's refresh token
}
```

2. OAuth Flow (one-time setup):

```typescript
import { generateAuthUrl, exchangeCodeForToken } from '@content-creation/linkedin';

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

### Basic Posting

```typescript
import { createLinkedInClient, createPost } from '@content-creation/linkedin';

// Create authenticated client
const clientResult = await createLinkedInClient(config);
if (!clientResult.success) {
  throw new Error('Authentication failed');
}

const client = clientResult.data;

// Post immediately
const postResult = await createPost(client, "Hello LinkedIn! 👋", "PUBLIC");
if (postResult.success) {
  console.log('Post created:', postResult.data.id);
}
```

### Postiz-Compatible Interface

```typescript
import { schedulePostToPlatform } from '@content-creation/linkedin';

// Works just like Postiz package
const result = await schedulePostToPlatform(
  config,
  "Your LinkedIn post content",
  "2024-12-25T10:00:00Z" // Optional: for future scheduling
);
```

### Get User Posts

```typescript
import { getPosts, getProfile } from '@content-creation/linkedin';

// Get user profile
const profile = await getProfile(client);
console.log(`Hello ${profile.data.firstName}!`);

// Get recent posts
const posts = await getPosts(client, 10);
console.log(`Found ${posts.data.length} posts`);
```

## API Limitations

- **No Native Scheduling**: LinkedIn API doesn't support scheduling. Use our shared scheduler or post immediately.
- **Analytics**: Basic analytics only. Full metrics require LinkedIn Marketing API access.
- **Media**: Image/video uploads require additional implementation.

## Integration with Existing System

This package follows the same functional patterns as `@content-creation/postiz`:

- Same `Result<T>` return types
- Same error handling patterns  
- Same logging and console output
- Compatible with existing scheduler UI

You can easily switch between Postiz and LinkedIn by changing the import:

```typescript
// From Postiz
import { schedulePostToPlatform } from '@content-creation/postiz';

// To LinkedIn  
import { schedulePostToPlatform } from '@content-creation/linkedin';
```