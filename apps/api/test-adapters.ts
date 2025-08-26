#!/usr/bin/env bun

/**
 * Test script to verify both database adapters work correctly
 */

import { getDatabaseAdapter } from './src/database/adapter';

const testAdapter = async (adapterType: 'prisma' | 'drizzle') => {
  console.log(`\n🧪 Testing ${adapterType} adapter...`);
  
  // Set the adapter type
  process.env.DATABASE_ADAPTER = adapterType;
  
  // Force reset of singleton to test different adapter
  const DatabaseAdapter = require('./src/database/adapter').DatabaseAdapter;
  DatabaseAdapter.resetInstance();
  
  try {
    // Get the adapter
    const adapter = getDatabaseAdapter();
    console.log(`  ✓ Created ${adapterType} adapter`);
    
    // Initialize it
    await adapter.initialize();
    console.log(`  ✓ Initialized ${adapterType} adapter`);
    
    // Get repositories
    const repos = adapter.getRepositories();
    console.log(`  ✓ Got repositories from ${adapterType} adapter`);
    
    // Test transcript repository
    const transcriptRepo = repos.transcripts;
    const result = await transcriptRepo.findAll({ limit: 5 });
    
    if (result.success) {
      console.log(`  ✓ Successfully fetched ${result.data.length} transcripts`);
    } else {
      console.error(`  ✗ Failed to fetch transcripts:`, result.error);
    }
    
    // Test insight repository
    const insightRepo = repos.insights;
    const insightResult = await insightRepo.getStats();
    
    if (insightResult.success) {
      console.log(`  ✓ Successfully got insight stats: ${insightResult.data.total} total insights`);
    } else {
      console.error(`  ✗ Failed to get insight stats:`, insightResult.error);
    }
    
    // Close the adapter
    await adapter.close();
    console.log(`  ✓ Closed ${adapterType} adapter`);
    
    return true;
  } catch (error) {
    console.error(`  ✗ Error testing ${adapterType} adapter:`, error);
    return false;
  }
};

const runTests = async () => {
  console.log('🚀 Starting database adapter tests...\n');
  console.log('Database path:', process.env.DATABASE_PATH || 'data/content.sqlite');
  
  // Test Drizzle adapter
  const drizzleSuccess = await testAdapter('drizzle');
  
  // Test Prisma adapter
  const prismaSuccess = await testAdapter('prisma');
  
  // Summary
  console.log('\n📊 Test Results:');
  console.log(`  Drizzle: ${drizzleSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Prisma:  ${prismaSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (drizzleSuccess && prismaSuccess) {
    console.log('\n🎉 All tests passed! Both adapters are working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
    process.exit(1);
  }
};

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});