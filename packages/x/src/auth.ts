import { XConfig, Result } from '@content-creation/shared';

/**
 * X/Twitter OAuth 2.0 authentication utilities
 * Based on Twitter API v2 documentation
 */

export interface XTokenResponse {
  token_type: 'bearer';
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

export interface XClient {
  config: XConfig;
  accessToken: string;
}

/**
 * Generate X OAuth 2.0 authorization URL with PKCE
 */
export const generateAuthUrl = (config: XConfig, state: string = ''): string => {
  // For X API v2, we need specific scopes for posting
  const scopes = [
    'tweet.read',
    'tweet.write', 
    'users.read',
    'offline.access'  // For refresh token
  ];
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: 'http://127.0.0.1:3000/callback', // You can make this configurable
    scope: scopes.join(' '),
    state,
    code_challenge: 'challenge',  // In production, generate proper PKCE challenge
    code_challenge_method: 'plain'
  });
  
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (
  config: XConfig,
  code: string,
  codeVerifier: string = 'challenge'  // In production, use proper PKCE
): Promise<Result<XTokenResponse>> => {
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://127.0.0.1:3000/callback',
      code_verifier: codeVerifier,
      client_id: config.clientId
    });

    // X API v2 uses Basic auth with client credentials
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: new Error(`X OAuth error: ${errorData.error_description || response.statusText}`)
      };
    }

    const tokenData = await response.json() as XTokenResponse;
    
    return {
      success: true,
      data: tokenData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  config: XConfig,
  refreshToken: string
): Promise<Result<XTokenResponse>> => {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId
    });

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: new Error(`X token refresh error: ${errorData.error_description || response.statusText}`)
      };
    }

    const tokenData = await response.json() as XTokenResponse;
    
    return {
      success: true,
      data: tokenData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Create X client with authentication
 */
export const createXClient = (config: XConfig): Result<XClient> => {
  if (!config.accessToken) {
    return {
      success: false,
      error: new Error('Access token is required. Please authenticate first.')
    };
  }

  return {
    success: true,
    data: {
      config,
      accessToken: config.accessToken
    }
  };
};

/**
 * Validate access token by making a test request
 */
export const validateAccessToken = async (
  client: XClient
): Promise<Result<boolean>> => {
  try {
    const response = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'User-Agent': 'ContentCreationBot/1.0'
      }
    });

    if (response.status === 401) {
      return {
        success: false,
        error: new Error('Access token is invalid or expired')
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: new Error(`Token validation failed: ${response.statusText}`)
      };
    }

    return {
      success: true,
      data: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Generate App-only Bearer Token (for read-only operations)
 * This doesn't require user authentication but can't post tweets
 */
export const generateAppOnlyToken = async (config: XConfig): Promise<Result<string>> => {
  try {
    const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: new Error(`App-only token error: ${errorData.error || response.statusText}`)
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data.access_token
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};