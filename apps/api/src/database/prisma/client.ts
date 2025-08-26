import { PrismaClient } from './generated';
import type { Result } from '@content-creation/types';

/**
 * Prisma Client Management
 * Handles database connection and initialization for Prisma
 */

let prisma: PrismaClient | null = null;

/**
 * Initialize Prisma client
 */
export const initPrismaClient = async (): Promise<PrismaClient> => {
  if (prisma) {
    return prisma;
  }

  try {
    // Use DATABASE_URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error']
    });

    // Test the connection
    await prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL database');

    return prisma;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma client:', error);
    throw error;
  }
};

/**
 * Get existing Prisma client (initializes if needed)
 */
export const getPrismaClient = async (): Promise<PrismaClient> => {
  if (!prisma) {
    return await initPrismaClient();
  }
  return prisma;
};

/**
 * Close Prisma connection
 */
export const closePrismaClient = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('📊 Prisma connection closed');
  }
};

/**
 * Run Prisma migrations
 */
export const runPrismaMigrations = async (): Promise<Result<void>> => {
  try {
    // For production, migrations should be run separately
    // This is just for development convenience
    if (process.env.NODE_ENV === 'development') {
      const { execSync } = require('child_process');
      
      const dbPath = getDatabasePath();
      process.env.DATABASE_URL = `file:${dbPath}`;
      
      // Deploy migrations (applies pending migrations)
      // Change to the API directory where schema.prisma is located
      const apiDir = process.cwd().includes('apps/api') 
        ? process.cwd() 
        : `${process.cwd()}/apps/api`;
      
      execSync('bunx prisma migrate deploy', {
        cwd: apiDir,
        stdio: 'inherit'
      });
      
      console.log('✅ Prisma migrations completed');
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('❌ Prisma migration failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
};

/**
 * Reset Prisma database (for testing)
 */
export const resetPrismaDatabase = async (): Promise<Result<void>> => {
  try {
    const client = await getPrismaClient();
    
    // Delete all data in reverse order of dependencies
    await client.analyticsEvent.deleteMany();
    await client.scheduledPost.deleteMany();
    await client.post.deleteMany();
    await client.insight.deleteMany();
    await client.transcript.deleteMany();
    await client.processingJob.deleteMany();
    await client.setting.deleteMany();
    
    console.log('🗑️ Prisma database reset completed');
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('❌ Failed to reset Prisma database:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
};