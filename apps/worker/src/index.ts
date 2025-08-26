#!/usr/bin/env bun

import { config } from 'dotenv';
import { WorkerScheduler } from './scheduler';
import { initDatabase, closeDatabase } from './database';

/**
 * Publishing Worker
 * Automated service for publishing scheduled social media posts
 */

// Load environment variables
config();

// Global state
let scheduler: WorkerScheduler | null = null;
let isShuttingDown = false;

/**
 * Initialize the worker
 */
async function init(): Promise<void> {
  console.log('🚀 [Worker] Starting Content Creation Publishing Worker...');
  console.log('🚀 [Worker] Version: 1.0.0');
  console.log('🚀 [Worker] Environment:', process.env.NODE_ENV || 'development');

  try {
    // Initialize database connection
    console.log('📊 [Worker] Initializing database connection...');
    initDatabase();
    console.log('✅ [Worker] Database connected');

    // Create and start scheduler
    console.log('⏰ [Worker] Initializing scheduler...');
    scheduler = new WorkerScheduler();
    scheduler.start();
    
    console.log('🎉 [Worker] Successfully started!');
    
    // Log initial status after a short delay
    setTimeout(async () => {
      if (scheduler) {
        const status = await scheduler.getStatus();
        console.log('📊 [Worker] Initial Status:', JSON.stringify(status, null, 2));
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
    // Stop scheduler
    if (scheduler) {
      scheduler.stop();
      scheduler = null;
      console.log('✅ [Worker] Scheduler stopped');
    }

    // Close database connection
    closeDatabase();
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
  if (!scheduler) {
    console.log('❌ Health: Worker not initialized');
    process.exit(1);
  }

  try {
    const status = await scheduler.getStatus();
    if (status.publisher.status === 'healthy' && status.scheduler.running) {
      console.log('✅ Health: Worker is healthy');
      process.exit(0);
    } else {
      console.log('❌ Health: Worker is unhealthy:', status.publisher.details);
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Health: Error checking health:', error);
    process.exit(1);
  }
}

/**
 * Manual trigger for testing
 */
async function manualTrigger(): Promise<void> {
  if (!scheduler) {
    console.log('❌ Worker not initialized');
    process.exit(1);
  }

  try {
    console.log('🚀 [Worker] Manual trigger requested');
    await scheduler.forceRun();
    console.log('✅ [Worker] Manual trigger completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker] Manual trigger failed:', error);
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
      await healthCheck();
      break;
    case 'trigger':
      setupSignalHandlers();
      await init();
      await manualTrigger();
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