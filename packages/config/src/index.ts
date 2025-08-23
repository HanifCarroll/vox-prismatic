import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import type { AppConfig } from '@content-creation/shared';

/**
 * Centralized configuration management
 * Loads all environment variables from the root .env file
 * and provides typed access to configuration across all apps
 */

/**
 * Finds the project root directory by looking for package.json with workspaces
 */
const findProjectRoot = (): string => {
  let currentDir = process.cwd();
  
  // Walk up the directory tree
  while (currentDir !== dirname(currentDir)) {
    const packageJsonPath = resolve(currentDir, 'package.json');
    
    if (existsSync(packageJsonPath)) {
      try {
        // Use import() instead of require() for Next.js compatibility
        const fs = require('fs');
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        
        // Check if this is the root package.json with workspaces
        if (packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Ignore invalid package.json files
      }
    }
    
    currentDir = dirname(currentDir);
  }
  
  // Fallback to current working directory
  return process.cwd();
};

/**
 * Loads environment variables from the project root .env file
 */
const loadEnvironmentVariables = (): void => {
  const projectRoot = findProjectRoot();
  const envPath = resolve(projectRoot, '.env');
  
  if (existsSync(envPath)) {
    const result = config({ path: envPath });
    if (result.error) {
      console.warn('Failed to load .env file:', result.error.message);
    }
  } else {
    console.warn(`No .env file found at: ${envPath}`);
  }
};

// Load environment variables immediately when this module is imported
loadEnvironmentVariables();

/**
 * Environment variable validation helper
 */
const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Environment variable with fallback
 */
const getOptionalEnv = (key: string, fallback?: string): string | undefined => {
  return process.env[key] || fallback;
};

/**
 * Validates that all required environment variables are present
 */
const validateEnvironment = (): void => {
  const requiredVars = [
    'NOTION_API_KEY',
    'GOOGLE_AI_API_KEY', 
    'NOTION_TRANSCRIPTS_DATABASE_ID',
    'NOTION_CLEANED_TRANSCRIPTS_DATABASE_ID',
    'NOTION_INSIGHTS_DATABASE_ID',
    'NOTION_POSTS_DATABASE_ID',
    'POSTIZ_API_KEY',
    'POSTIZ_BASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

/**
 * Creates and validates the application configuration
 * This is the single source of truth for all configuration
 */
export const createConfig = (): AppConfig => {
  // Validate environment before creating config
  validateEnvironment();

  return {
    notion: {
      apiKey: getRequiredEnv('NOTION_API_KEY'),
      transcriptsDb: getRequiredEnv('NOTION_TRANSCRIPTS_DATABASE_ID'),
      cleanedTranscriptsDb: getRequiredEnv('NOTION_CLEANED_TRANSCRIPTS_DATABASE_ID'),
      insightsDb: getRequiredEnv('NOTION_INSIGHTS_DATABASE_ID'),
      postsDb: getRequiredEnv('NOTION_POSTS_DATABASE_ID'),
    },
    ai: {
      apiKey: getRequiredEnv('GOOGLE_AI_API_KEY'),
      flashModel: getOptionalEnv('AI_FLASH_MODEL', 'gemini-2.5-flash') || 'gemini-2.5-flash',
      proModel: getOptionalEnv('AI_PRO_MODEL', 'gemini-2.5-pro') || 'gemini-2.5-pro',
    },
    postiz: {
      apiKey: getRequiredEnv('POSTIZ_API_KEY'),
      baseUrl: getRequiredEnv('POSTIZ_BASE_URL'),
    },
  };
};

/**
 * Validates an existing configuration object
 */
export const validateConfig = (config: AppConfig): boolean => {
  return !!(
    config.notion.apiKey &&
    config.notion.transcriptsDb &&
    config.notion.cleanedTranscriptsDb &&
    config.notion.insightsDb &&
    config.notion.postsDb &&
    config.ai.apiKey &&
    config.postiz.apiKey &&
    config.postiz.baseUrl
  );
};

/**
 * Pre-configured application config instance
 * Use this for apps that need immediate access to config
 */
let configInstance: AppConfig | null = null;

export const getConfig = (): AppConfig => {
  if (!configInstance) {
    configInstance = createConfig();
  }
  return configInstance;
};

/**
 * Check if configuration is available without throwing
 * Useful for optional features or graceful degradation
 */
export const isConfigured = (): boolean => {
  try {
    validateEnvironment();
    return true;
  } catch {
    return false;
  }
};

/**
 * Get configuration with graceful error handling
 * Returns null if configuration is not available
 */
export const tryGetConfig = (): AppConfig | null => {
  try {
    return getConfig();
  } catch (error) {
    console.warn('Configuration not available:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Re-export types for convenience
export type { AppConfig } from '@content-creation/shared';