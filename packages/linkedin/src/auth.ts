import { LinkedInConfig, Result } from '@content-creation/shared';

/**
 * LinkedIn OAuth 2.0 authentication utilities
 */

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInClient {
  config: LinkedInConfig;
  accessToken: string;
}

/**
 * Generate LinkedIn OAuth 2.0 authorization URL
 */
export const generateAuthUrl = (config: LinkedInConfig, state: string = ''): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: 'w_member_social profile openid email' // Required scopes for posting
  });
  
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (
  config: LinkedInConfig,
  code: string
): Promise<Result<LinkedInTokenResponse>> => {
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: new Error(`LinkedIn OAuth error: ${errorData.error_description || response.statusText}`)
      };
    }

    const tokenData = await response.json() as LinkedInTokenResponse;
    
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
  config: LinkedInConfig,
  refreshToken: string
): Promise<Result<LinkedInTokenResponse>> => {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: new Error(`LinkedIn token refresh error: ${errorData.error_description || response.statusText}`)
      };
    }

    const tokenData = await response.json() as LinkedInTokenResponse;
    
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
 * Create LinkedIn client with authentication
 */
export const createLinkedInClient = (config: LinkedInConfig): Result<LinkedInClient> => {
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
  client: LinkedInClient
): Promise<Result<boolean>> => {
  try {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'LinkedIn-Version': '202212'
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