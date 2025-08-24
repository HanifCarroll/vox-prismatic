#!/usr/bin/env bun
/**
 * CLI runner for the scheduler processor
 * Can be run manually or via cron jobs
 */

import { runProcessor, startContinuousProcessor, ProcessorConfig } from './processor';
import { getStats } from './scheduler';

// This would normally come from your configuration system
const getConfig = (): ProcessorConfig => {
  // You'll need to implement proper config loading
  // For now, return empty config (processor will skip platforms without config)
  return {
    maxConcurrent: 3,
    retryDelay: 2000,  // 2 seconds between batches
    // linkedin: loadLinkedInConfig(),
    // x: loadXConfig(), 
    // postiz: loadPostizConfig()
  };
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  switch (command) {
    case 'run':
      // Single run
      console.log('🚀 Running scheduler processor once...');
      await runProcessor(getConfig());
      break;

    case 'start':
      // Continuous mode
      const intervalMinutes = parseInt(args[1]) || 5;
      console.log(`🔄 Starting continuous processor (every ${intervalMinutes} minutes)...`);
      const stop = startContinuousProcessor(getConfig(), intervalMinutes);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n📴 Shutting down processor...');
        stop();
        process.exit(0);
      });
      
      // Keep process alive
      process.stdin.resume();
      break;

    case 'stats':
      // Show statistics
      const statsResult = getStats();
      if (statsResult.success) {
        console.log('📊 Scheduler Statistics:');
        console.log(`   Total posts: ${statsResult.data.total}`);
        console.log(`   Pending: ${statsResult.data.pending}`);
        console.log(`   Published: ${statsResult.data.published}`);
        console.log(`   Failed: ${statsResult.data.failed}`);
        console.log(`   Cancelled: ${statsResult.data.cancelled}`);
        console.log('\n📱 By Platform:');
        Object.entries(statsResult.data.byPlatform).forEach(([platform, count]) => {
          console.log(`   ${platform}: ${count}`);
        });
      } else {
        console.error('❌ Failed to get stats:', statsResult.error.message);
      }
      break;

    default:
      console.log(`
📅 Scheduler CLI

Usage:
  bun cli.ts run              # Run processor once
  bun cli.ts start [minutes]  # Start continuous processor (default: 5 minutes)
  bun cli.ts stats            # Show scheduler statistics

Examples:
  bun cli.ts run                 # Process ready posts now
  bun cli.ts start 10            # Run every 10 minutes
  bun cli.ts stats               # Show current stats
      `);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

if (import.meta.main) {
  main().catch(error => {
    console.error('💥 CLI error:', error);
    process.exit(1);
  });
}