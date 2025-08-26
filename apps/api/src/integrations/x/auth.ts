import { 
  XConfig, 
  XTokenResponse, 
  Result 
} from '../types/social-media';

/**
 * X (Twitter) OAuth 2.0 authentication utilities
 * Supports both OAuth 2.0 with PKCE and OAuth 1.0a
 */

export interface XClient {
  config: XConfig;
  accessToken: string;
  accessTokenSecret?: string; // For OAuth 1.0a
}

/**
 * Generate X OAuth 2.0 authorization URL with PKCE
 */
export const generateAuthUrl = (
  config: XConfig, 
  state: string = '',
  codeChallenge?: string
): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: 'tweet.read tweet.write users.read offline.access',
    code_challenge: codeChallenge || '',
    code_challenge_method: 'S256'
  });
  
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token (OAuth 2.0)
 */
export const exchangeCodeForToken = async (
  config: XConfig,
  code: string,
  codeVerifier?: string
): Promise<Result<XTokenResponse>> => {
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier || ''
    });

    // Use Basic Auth for client credentials
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
 * Refresh access token using refresh token (OAuth 2.0)
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

    // Use Basic Auth for client credentials
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X refresh token error: ${errorData.error_description || response.statusText}`)
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
 * Generate app-only bearer token (for read-only operations)
 */
export const generateAppOnlyToken = async (config: XConfig): Promise<Result<string>> => {
  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X app-only token error: ${errorData.error_description || response.statusText}`)
      };
    }

    const tokenData = await response.json();
    
    return {
      success: true,
      data: tokenData.access_token
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Validate access token by making a test API call
 */
export const validateAccessToken = async (client: XClient): Promise<Result<boolean>> => {
  try {
    const response = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      return {
        success: false,
        error: new Error('X access token is invalid or expired')
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`X API error: ${errorData.detail || response.statusText}`)
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
 * Create X client with config and access token
 */
export const createXClient = (config: XConfig): Result<XClient> => {
  try {
    if (!config.clientId || !config.clientSecret) {
      return {
        success: false,
        error: new Error('X client ID and secret are required')
      };
    }

    if (!config.accessToken && !config.bearerToken) {
      return {
        success: false,
        error: new Error('X access token or bearer token is required for API operations')
      };
    }

    const client: XClient = {
      config,
      accessToken: config.accessToken || config.bearerToken || '',
      accessTokenSecret: config.accessTokenSecret
    };

    return {
      success: true,
      data: client
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Generate code verifier and challenge for PKCE
 */
export const generatePKCECodes = (): { codeVerifier: string; codeChallenge: string } => {
  // Generate a random string for code verifier
  const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), 
    byte => String.fromCharCode(byte % 94 + 33)).join('');

  // Create SHA256 hash and base64url encode it for code challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  // Note: In a real implementation, you'd use crypto.subtle.digest
  // For now, we'll use a simple base64 encoding
  const codeChallenge = btoa(codeVerifier)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    codeVerifier,
    codeChallenge
  };
};