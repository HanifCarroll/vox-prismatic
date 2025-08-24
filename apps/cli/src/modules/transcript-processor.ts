import prompts from 'prompts';
import { AppConfig, ProcessingMetrics, Result } from '@content-creation/shared';
import { 
  initDatabase,
  getTranscripts,
  updateTranscriptStatus,
  type TranscriptRecord 
} from '@content-creation/database';
import { createAIClient, cleanTranscript, extractInsights } from '@content-creation/ai';
import { display } from '@content-creation/content-pipeline';
import { saveToDebugFile, formatDuration, formatCost, formatNumber, createMetricsSummary } from '@content-creation/shared';

/**
 * Functional transcript processing module
 */

/**
 * Displays available transcripts and gets user selection using prompts
 */
const selectTranscriptsToProcess = async (
  availableTranscripts: TranscriptRecord[]
): Promise<TranscriptRecord[]> => {
  if (availableTranscripts.length === 0) {
    display.info('No transcripts available for processing.');
    return [];
  }

  console.log(`\n📋 Found ${availableTranscripts.length} transcript${availableTranscripts.length === 1 ? '' : 's'} ready for processing\n`);

  // Create choices for multiselect
  const choices = availableTranscripts.map((transcript, index) => ({
    title: transcript.title,
    value: transcript,
    selected: false // None selected by default
  }));

  try {
    // First prompt: choose selection method
    const selectionMethod = await prompts({
      type: 'select',
      name: 'method',
      message: 'How would you like to select transcripts?',
      choices: [
        {
          title: '📝 Choose specific transcripts',
          description: 'Select individual transcripts with spacebar',
          value: 'multiselect'
        },
        {
          title: '🎯 Process ALL transcripts',
          description: `Process all ${availableTranscripts.length} available transcripts`,
          value: 'all'
        },
        {
          title: '❌ Cancel',
          description: 'Exit without processing',
          value: 'cancel'
        }
      ],
      initial: 0
    });

    if (!selectionMethod.method || selectionMethod.method === 'cancel') {
      return [];
    }

    if (selectionMethod.method === 'all') {
      display.success(`Selected ALL ${availableTranscripts.length} transcripts for processing`);
      return availableTranscripts;
    }

    // Add spacing and show instructions before the list
    console.log('\n📋 Available Transcripts');
    console.log('─'.repeat(50));
    console.log('Use ↑/↓ to navigate, Space to select, Enter to confirm\n');
    
    const response = await prompts({
      type: 'multiselect',
      name: 'selectedTranscripts',
      message: 'Select transcripts to process',
      choices: choices,
      hint: '- Space to select, Enter to confirm, Ctrl+C to cancel',
      instructions: false
    });

    // Handle user cancellation
    if (!response.selectedTranscripts) {
      return [];
    }

    const selectedTranscripts = response.selectedTranscripts;

    if (selectedTranscripts.length === 0) {
      display.info('No transcripts selected.');
      return [];
    }

    display.success(`Selected ${selectedTranscripts.length} transcript${selectedTranscripts.length === 1 ? '' : 's'} for processing:`);
    selectedTranscripts.forEach((t: TranscriptRecord) => console.log(`  • ${t.title}`));

    return selectedTranscripts;

  } catch (error) {
    display.error('Selection cancelled or failed.');
    return [];
  }
};

/**
 * Processes a single transcript through the AI pipeline
 */
const processTranscript = async (
  transcript: TranscriptRecord,
  config: AppConfig
): Promise<ProcessingMetrics> => {
  const startTime = Date.now();
  const { flashModel, proModel } = createAIClient(config.ai);
  
  const metrics: ProcessingMetrics = {
    transcriptId: transcript.id,
    transcriptTitle: transcript.title,
    startTime,
    contentLength: transcript.content.length,
    cleaningDuration: 0,
    insightExtractionDuration: 0,
    insightsGenerated: 0,
    estimatedTokensUsed: 0,
    estimatedCost: 0,
    success: false
  };

  try {
    console.log(`\n🚀 Processing transcript: ${transcript.title}`);
    console.log(`📄 Content length: ${formatNumber(transcript.content.length)} characters`);
    
    // Clean transcript first
    console.log('🧹 Cleaning transcript...');
    const cleanResult = await cleanTranscript(
      flashModel, 
      transcript.content,
      transcript.id,
      `Cleaned: ${transcript.title}`
    );
    if (!cleanResult.success) {
      throw cleanResult.error;
    }
    
    metrics.cleaningDuration = cleanResult.data.duration;
    metrics.estimatedCost += cleanResult.data.cost;
    
    console.log(`✅ Cleaned transcript in ${formatDuration(cleanResult.data.duration)}`);
    console.log(`📄 Cleaned content length: ${formatNumber(cleanResult.data.cleanedText.length)} characters`);
    
    // Extract insights from cleaned content
    console.log('💡 Extracting insights...');
    const insightResult = await extractInsights(
      proModel, 
      cleanResult.data.cleanedText,
      cleanResult.data.cleanedTranscriptId
    );
    if (!insightResult.success) {
      throw insightResult.error;
    }
    
    metrics.insightExtractionDuration = insightResult.data.duration;
    metrics.estimatedCost += insightResult.data.cost;
    metrics.insightsGenerated = insightResult.data.insights.length;
    
    console.log(`✅ Extracted ${insightResult.data.insights.length} insights in ${formatDuration(insightResult.data.duration)}`);
    
    // Save parsed insights to debug
    saveToDebugFile('parsed-insights', insightResult.data.insights);
    
    console.log(`📊 Created ${insightResult.data.insightIds.length} insights in database`);
    
    // Update transcript status to indicate processing is complete
    const statusResult = updateTranscriptStatus(transcript.id, 'processed');
    if (!statusResult.success) {
      console.log('⚠️ Failed to update transcript status');
    }
    
    // Finalize metrics
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.success = true;
    
    console.log(`🎉 Processing completed in ${formatDuration(metrics.duration!)}`);
    console.log(`💰 Total cost: ${formatCost(metrics.estimatedCost)}`);
    
    return metrics;
    
  } catch (error) {
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.error = error instanceof Error ? error.message : 'Unknown error';
    
    display.error(`Failed to process "${transcript.title}": ${metrics.error}`);
    return metrics;
  }
};

/**
 * Displays session summary with metrics
 */
const displaySessionSummary = (allMetrics: ProcessingMetrics[]): void => {
  if (allMetrics.length === 0) {
    return;
  }

  console.log('\n📊 PROCESSING SESSION SUMMARY');
  display.separator();
  
  const successful = allMetrics.filter(m => m.success);
  const failed = allMetrics.filter(m => !m.success);
  const totalDuration = allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
  const totalCost = allMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
  const totalInsights = allMetrics.reduce((sum, m) => sum + m.insightsGenerated, 0);

  console.log(`📈 Results: ${successful.length} successful, ${failed.length} failed`);
  console.log(`⏱️  Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`💰 Total Cost: ${formatCost(totalCost)}`);
  console.log(`💡 Total Insights Generated: ${formatNumber(totalInsights)}`);

  if (successful.length > 0) {
    const avgDuration = totalDuration / successful.length;
    const avgCost = totalCost / successful.length;
    console.log(`📊 Averages per transcript: ${formatDuration(avgDuration)}, ${formatCost(avgCost)}`);
  }

  // Log failed transcripts if any
  if (failed.length > 0) {
    console.log('\n⚠️ Failed transcripts:');
    failed.forEach(metrics => {
      console.log(`  • ${metrics.transcriptTitle}: ${metrics.error}`);
    });
  }

  // Save session summary
  const sessionSummary = createMetricsSummary(allMetrics);
  saveToDebugFile('transcript-processing-session', sessionSummary);
};

/**
 * Main transcript processor function
 */
export const runTranscriptProcessor = async (config: AppConfig): Promise<void> => {
  try {
    display.info('Starting interactive transcript processing...');
    
    // Initialize database
    initDatabase();
    
    // Get transcripts ready for processing (raw transcripts, not cleaned)
    const transcriptsResult = getTranscripts({ 
      status: 'pending',
      limit: 50,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    if (!transcriptsResult.success) {
      throw transcriptsResult.error;
    }
    
    const readyTranscripts = transcriptsResult.data;
    
    if (readyTranscripts.length === 0) {
      display.success('No transcripts ready for processing! Please save some transcripts first.');
      return;
    }
    
    display.info(`Found ${readyTranscripts.length} transcript${readyTranscripts.length === 1 ? '' : 's'} ready for processing`);
    
    // Get user selection
    const selectedTranscripts = await selectTranscriptsToProcess(readyTranscripts);
    
    if (selectedTranscripts.length === 0) {
      display.info('Exiting without processing any transcripts.');
      return;
    }

    // Process selected transcripts
    console.log(`\n🔄 Processing ${selectedTranscripts.length} selected transcript${selectedTranscripts.length === 1 ? '' : 's'}...\n`);
    
    const allMetrics: ProcessingMetrics[] = [];
    
    for (const transcript of selectedTranscripts) {
      const metrics = await processTranscript(transcript, config);
      allMetrics.push(metrics);
      
      // Save individual metrics
      saveToDebugFile('transcript-processing-metrics', metrics);
    }
    
    // Display final summary
    displaySessionSummary(allMetrics);
    
    display.success('Transcript processing completed!');
    
  } catch (error) {
    display.error(`Fatal error in transcript processing: ${error}`);
    throw error;
  }
};