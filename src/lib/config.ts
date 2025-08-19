import { AppConfig } from './types.ts';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates application configuration from environment variables
 */
export const createConfig = (): AppConfig => {
  const requiredEnvVars = {
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    NOTION_TRANSCRIPTS_DATABASE_ID: process.env.NOTION_TRANSCRIPTS_DATABASE_ID,
    NOTION_INSIGHTS_DATABASE_ID: process.env.NOTION_INSIGHTS_DATABASE_ID,
    NOTION_POSTS_DATABASE_ID: process.env.NOTION_POSTS_DATABASE_ID,
  };

  // Validate all required environment variables
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    notion: {
      apiKey: requiredEnvVars.NOTION_API_KEY!,
      transcriptsDb: requiredEnvVars.NOTION_TRANSCRIPTS_DATABASE_ID!,
      insightsDb: requiredEnvVars.NOTION_INSIGHTS_DATABASE_ID!,
      postsDb: requiredEnvVars.NOTION_POSTS_DATABASE_ID!,
    },
    ai: {
      apiKey: requiredEnvVars.GOOGLE_AI_API_KEY!,
      flashModel: 'gemini-2.5-flash',
      proModel: 'gemini-2.5-pro',
    },
  };
};

/**
 * Validates configuration object
 */
export const validateConfig = (config: AppConfig): boolean => {
  return !!(
    config.notion.apiKey &&
    config.notion.transcriptsDb &&
    config.notion.insightsDb &&
    config.notion.postsDb &&
    config.ai.apiKey
  );
};