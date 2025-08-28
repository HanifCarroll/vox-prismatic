#!/usr/bin/env bun

import { config } from 'dotenv';
import { WorkerQueueProcessor } from './queue-processor';
import { initDatabase, closeDatabase } from './database';

/**
 * Publishing Worker
 * Queue-based service for publishing scheduled social media posts
 */

// Load environment variables
config();

// Global state
let queueProcessor: WorkerQueueProcessor | null = null;
let isShuttingDown = false;

/**
 * Initialize the worker
 */
async function init(): Promise<void> {
  console.log('🚀 [Worker] Starting Content Creation Publishing Worker...');
  console.log('🚀 [Worker] Version: 2.0.0 (Queue-based)');
  console.log('🚀 [Worker] Environment:', process.env.NODE_ENV || 'development');

  try {
    // Initialize database connection
    console.log('📊 [Worker] Initializing database connection...');
    const prisma = await initDatabase();
    console.log('✅ [Worker] Database connected');

    // Create and start queue processor
    console.log('⏰ [Worker] Initializing queue processor...');
    queueProcessor = new WorkerQueueProcessor(prisma);
    await queueProcessor.initialize();
    await queueProcessor.start();
    
    console.log('🎉 [Worker] Successfully started!');
    console.log('📡 [Worker] Listening for jobs from the queue...');
    
    // Log initial status after a short delay
    setTimeout(async () => {
      if (queueProcessor) {
        const health = await queueProcessor.healthCheck();
        console.log('📊 [Worker] Initial Health:', JSON.stringify(health, null, 2));
      }
    }, 2000);

  } catch (error) {
    console.error('❌ [Worker] Failed to start:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🛑 [Worker] Shutting down gracefully...');

  try {
    // Stop queue processor
    if (queueProcessor) {
      await queueProcessor.stop();
      queueProcessor = null;
      console.log('✅ [Worker] Queue processor stopped');
    }

    // Close database connection
    await closeDatabase();
    console.log('✅ [Worker] Database connection closed');

    console.log('👋 [Worker] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(): void {
  // Handle termination signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
  // Handle process errors
  process.on('uncaughtException', (error) => {
    console.error('❌ [Worker] Uncaught exception:', error);
    shutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [Worker] Unhandled rejection at:', promise, 'reason:', reason);
    shutdown();
  });
}

/**
 * Health check endpoint (if needed for Docker health checks)
 */
async function healthCheck(): Promise<void> {
  if (!queueProcessor) {
    console.log('❌ Health: Worker not initialized');
    process.exit(1);
  }

  try {
    const health = await queueProcessor.healthCheck();
    if (health.healthy) {
      console.log('✅ Health: Worker is healthy');
      console.log('📊 Health Details:', JSON.stringify(health.details, null, 2));
      process.exit(0);
    } else {
      console.log('❌ Health: Worker is unhealthy');
      console.log('📊 Health Details:', JSON.stringify(health.details, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Health: Error checking health:', error);
    process.exit(1);
  }
}

/**
 * Get worker statistics
 */
async function getStats(): Promise<void> {
  if (!queueProcessor) {
    console.log('❌ Worker not initialized');
    process.exit(1);
  }

  try {
    const stats = await queueProcessor.getStats();
    console.log('📊 [Worker] Statistics:', JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker] Failed to get stats:', error);
    process.exit(1);
  }
}

/**
 * Pause worker processing
 */
async function pauseWorker(): Promise<void> {
  if (!queueProcessor) {
    console.log('❌ Worker not initialized');
    process.exit(1);
  }

  try {
    await queueProcessor.pause();
    console.log('⏸️ [Worker] Processing paused');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker] Failed to pause:', error);
    process.exit(1);
  }
}

/**
 * Resume worker processing
 */
async function resumeWorker(): Promise<void> {
  if (!queueProcessor) {
    console.log('❌ Worker not initialized');
    process.exit(1);
  }

  try {
    await queueProcessor.resume();
    console.log('▶️ [Worker] Processing resumed');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker] Failed to resume:', error);
    process.exit(1);
  }
}

/**
 * Main function - handle command line arguments
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'health':
      setupSignalHandlers();
      await init();
      await healthCheck();
      break;
    case 'stats':
      setupSignalHandlers();
      await init();
      await getStats();
      break;
    case 'pause':
      setupSignalHandlers();
      await init();
      await pauseWorker();
      break;
    case 'resume':
      setupSignalHandlers();
      await init();
      await resumeWorker();
      break;
    case 'start':
    default:
      setupSignalHandlers();
      await init();
      
      // Keep the process alive
      process.stdin.resume();
      break;
  }
}

// Start the worker
main().catch((error) => {
  console.error('❌ [Worker] Fatal error:', error);
  process.exit(1);
});