import { Hono } from 'hono';
import { 
  LinkedInConfig, 
  XConfig, 
  Platform, 
  Result 
} from '../integrations/types/social-media';
import { generateId } from '../lib/id-generator';

// LinkedIn integration
import { 
  createLinkedInClient,
  generateAuthUrl as generateLinkedInAuthUrl,
  exchangeCodeForToken as exchangeLinkedInToken,
  schedulePostToPlatform as scheduleLinkedInPost
} from '../integrations/linkedin/client';

// X integration
import { 
  createXClient,
  generateAuthUrl as generateXAuthUrl,
  exchangeCodeForToken as exchangeXToken,
  schedulePostToPlatform as scheduleXPost,
  createPostOrThread,
  generatePKCECodes
} from '../integrations/x/client';

const socialMedia = new Hono();

/**
 * Social Media API Routes
 * Provides OAuth flows and posting capabilities for LinkedIn and X
 */

// LinkedIn OAuth Routes

// GET /social-media/linkedin/auth - Generate LinkedIn OAuth URL
socialMedia.get('/linkedin/auth', async (c) => {
  try {
    const config: LinkedInConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
    };

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return c.json(
        {
          success: false,
          error: 'LinkedIn OAuth configuration is incomplete. Check environment variables.'
        },
        500
      );
    }

    const state = generateId('linkedin');
    const authUrl = generateLinkedInAuthUrl(config, state);

    return c.json({
      success: true,
      data: {
        authUrl,
        state
      }
    });
  } catch (error) {
    console.error('Failed to generate LinkedIn auth URL:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL'
      },
      500
    );
  }
});

// POST /social-media/linkedin/callback - Handle LinkedIn OAuth callback
socialMedia.post('/linkedin/callback', async (c) => {
  try {
    const body = await c.req.json();
    const { code, state } = body;

    if (!code) {
      return c.json(
        {
          success: false,
          error: 'Authorization code is required'
        },
        400
      );
    }

    const config: LinkedInConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
    };

    const tokenResult = await exchangeLinkedInToken(config, code);
    if (!tokenResult.success) {
      return c.json(
        {
          success: false,
          error: tokenResult.error instanceof Error ? tokenResult.error.message : 'Token exchange failed'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        platform: 'linkedin',
        accessToken: tokenResult.data.access_token,
        expiresIn: tokenResult.data.expires_in,
        refreshToken: tokenResult.data.refresh_token
      }
    });
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed'
      },
      500
    );
  }
});

// POST /social-media/linkedin/post - Create LinkedIn post
socialMedia.post('/linkedin/post', async (c) => {
  try {
    const body = await c.req.json();
    const { content, visibility, accessToken } = body;

    if (!content || !accessToken) {
      return c.json(
        {
          success: false,
          error: 'Content and access token are required'
        },
        400
      );
    }

    const config: LinkedInConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
      accessToken
    };

    const clientResult = await createLinkedInClient(config);
    if (!clientResult.success) {
      return c.json(
        {
          success: false,
          error: clientResult.error instanceof Error ? clientResult.error.message : 'Failed to create client'
        },
        500
      );
    }

    const postResult = await clientResult.data.createPost(content, visibility);
    if (!postResult.success) {
      return c.json(
        {
          success: false,
          error: postResult.error instanceof Error ? postResult.error.message : 'Failed to create post'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: postResult.data
    });
  } catch (error) {
    console.error('LinkedIn post creation error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      },
      500
    );
  }
});

// X OAuth Routes

// GET /social-media/x/auth - Generate X OAuth URL
socialMedia.get('/x/auth', async (c) => {
  try {
    const config: XConfig = {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || ''
    };

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return c.json(
        {
          success: false,
          error: 'X OAuth configuration is incomplete. Check environment variables.'
        },
        500
      );
    }

    const state = generateId('x');
    const { codeVerifier, codeChallenge } = generatePKCECodes();
    const authUrl = generateXAuthUrl(config, state, codeChallenge);

    return c.json({
      success: true,
      data: {
        authUrl,
        state,
        codeVerifier // Store this for the callback
      }
    });
  } catch (error) {
    console.error('Failed to generate X auth URL:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL'
      },
      500
    );
  }
});

// POST /social-media/x/callback - Handle X OAuth callback
socialMedia.post('/x/callback', async (c) => {
  try {
    const body = await c.req.json();
    const { code, state, codeVerifier } = body;

    if (!code || !codeVerifier) {
      return c.json(
        {
          success: false,
          error: 'Authorization code and code verifier are required'
        },
        400
      );
    }

    const config: XConfig = {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || ''
    };

    const tokenResult = await exchangeXToken(config, code, codeVerifier);
    if (!tokenResult.success) {
      return c.json(
        {
          success: false,
          error: tokenResult.error instanceof Error ? tokenResult.error.message : 'Token exchange failed'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        platform: 'x',
        accessToken: tokenResult.data.access_token,
        expiresIn: tokenResult.data.expires_in,
        refreshToken: tokenResult.data.refresh_token
      }
    });
  } catch (error) {
    console.error('X OAuth callback error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed'
      },
      500
    );
  }
});

// POST /social-media/x/tweet - Create X tweet/thread
socialMedia.post('/x/tweet', async (c) => {
  try {
    const body = await c.req.json();
    const { content, accessToken, options } = body;

    if (!content || !accessToken) {
      return c.json(
        {
          success: false,
          error: 'Content and access token are required'
        },
        400
      );
    }

    const config: XConfig = {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || '',
      accessToken
    };

    const result = await createPostOrThread(config, content, options);
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to create tweet'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('X tweet creation error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tweet'
      },
      500
    );
  }
});

// GET /social-media/profiles - Get connected profiles
socialMedia.get('/profiles', async (c) => {
  try {
    const { linkedinToken, xToken } = c.req.query();
    const profiles: any[] = [];

    // Get LinkedIn profile if token provided
    if (linkedinToken) {
      const linkedinConfig: LinkedInConfig = {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
        accessToken: linkedinToken
      };

      try {
        const clientResult = await createLinkedInClient(linkedinConfig);
        if (clientResult.success) {
          const profileResult = await clientResult.data.getProfile();
          if (profileResult.success) {
            profiles.push({
              platform: 'linkedin',
              ...profileResult.data
            });
          }
        }
      } catch (error) {
        console.warn('Failed to get LinkedIn profile:', error);
      }
    }

    // Get X profile if token provided
    if (xToken) {
      const xConfig: XConfig = {
        clientId: process.env.X_CLIENT_ID || '',
        clientSecret: process.env.X_CLIENT_SECRET || '',
        redirectUri: process.env.X_REDIRECT_URI || '',
        accessToken: xToken
      };

      try {
        const clientResult = await createXClient(xConfig);
        if (clientResult.success) {
          const profileResult = await clientResult.data.getProfile();
          if (profileResult.success) {
            profiles.push({
              platform: 'x',
              ...profileResult.data
            });
          }
        }
      } catch (error) {
        console.warn('Failed to get X profile:', error);
      }
    }

    return c.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('Failed to get profiles:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profiles'
      },
      500
    );
  }
});

export default socialMedia;