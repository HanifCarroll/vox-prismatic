import prompts from 'prompts';
import { AppConfig, TranscriptPage, ProcessingMetrics, Result } from '../lib/types.ts';
import { createNotionClient, transcripts, getPageContent, insights } from '../lib/notion.ts';
import { createAIClient, cleanTranscript, extractInsights } from '../lib/ai.ts';
import { display } from '../lib/io.ts';
import { saveToDebugFile, formatDuration, formatCost, formatNumber, createMetricsSummary } from '../lib/utils.ts';

/**
 * Functional transcript processing module
 */

/**
 * Displays available transcripts and gets user selection using prompts
 */
const selectTranscriptsToProcess = async (
  availableTranscripts: TranscriptPage[]
): Promise<TranscriptPage[]> => {
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

  // Add "Select All" option
  const selectAllChoice = {
    title: '🎯 Select ALL transcripts',
    value: 'SELECT_ALL',
    selected: false
  };

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
    selectedTranscripts.forEach((t: TranscriptPage) => console.log(`  • ${t.title}`));

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
  transcript: TranscriptPage,
  config: AppConfig
): Promise<ProcessingMetrics> => {
  const startTime = Date.now();
  const notionClient = createNotionClient(config.notion);
  const { flashModel, proModel } = createAIClient(config.ai);
  
  const metrics: ProcessingMetrics = {
    transcriptId: transcript.id,
    transcriptTitle: transcript.title,
    startTime,
    contentLength: 0,
    cleaningDuration: 0,
    insightExtractionDuration: 0,
    insightsGenerated: 0,
    estimatedTokensUsed: 0,
    estimatedCost: 0,
    success: false
  };

  try {
    console.log(`\n🚀 Processing transcript: ${transcript.title}`);
    
    // Get raw content
    const contentResult = await getPageContent(notionClient, transcript.id);
    if (!contentResult.success) {
      throw contentResult.error;
    }
    
    const rawContent = contentResult.data;
    metrics.contentLength = rawContent.length;
    console.log(`📄 Content length: ${formatNumber(rawContent.length)} characters`);
    
    // Clean transcript
    console.log('🧹 Cleaning transcript...');
    const cleaningResult = await cleanTranscript(flashModel, rawContent);
    if (!cleaningResult.success) {
      throw cleaningResult.error;
    }
    
    metrics.cleaningDuration = cleaningResult.data.duration;
    metrics.estimatedCost += cleaningResult.data.cost;
    console.log(`✅ Cleaned in ${formatDuration(cleaningResult.data.duration)}`);
    
    // Save cleaned content to debug
    saveToDebugFile('cleaned-transcript', {
      transcriptId: transcript.id,
      title: transcript.title,
      originalLength: rawContent.length,
      cleanedLength: cleaningResult.data.cleanedText.length,
      content: cleaningResult.data.cleanedText
    });
    
    // Extract insights
    console.log('💡 Extracting insights...');
    const insightResult = await extractInsights(proModel, cleaningResult.data.cleanedText);
    if (!insightResult.success) {
      throw insightResult.error;
    }
    
    metrics.insightExtractionDuration = insightResult.data.duration;
    metrics.estimatedCost += insightResult.data.cost;
    metrics.insightsGenerated = insightResult.data.insights.length;
    
    console.log(`✅ Extracted ${insightResult.data.insights.length} insights in ${formatDuration(insightResult.data.duration)}`);
    
    // Save parsed insights to debug
    saveToDebugFile('parsed-insights', insightResult.data.insights);
    
    // Create insight pages in Notion
    console.log('📝 Creating insight pages...');
    let createdCount = 0;
    
    for (const insight of insightResult.data.insights) {
      const createResult = await insights.create(notionClient, config.notion, insight, transcript.id);
      if (createResult.success) {
        createdCount++;
        console.log(`  ✅ Created: "${insight.title}" (Score: ${insight.scores.total})`);
      } else {
        console.log(`  ❌ Failed to create: "${insight.title}"`);
      }
    }
    
    console.log(`📊 Created ${createdCount}/${insightResult.data.insights.length} insight pages`);
    
    // Update transcript status
    const statusResult = await transcripts.updateStatus(notionClient, transcript.id, 'Processed');
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
    
    const notionClient = createNotionClient(config.notion);
    
    // Get pending transcripts
    const transcriptsResult = await transcripts.getPending(notionClient, config.notion);
    if (!transcriptsResult.success) {
      throw transcriptsResult.error;
    }
    
    const pendingTranscripts = transcriptsResult.data;
    
    if (pendingTranscripts.length === 0) {
      display.success('No transcripts need processing! All transcripts are up to date.');
      return;
    }
    
    display.info(`Found ${pendingTranscripts.length} transcript${pendingTranscripts.length === 1 ? '' : 's'} ready for processing`);
    
    // Get user selection
    const selectedTranscripts = await selectTranscriptsToProcess(pendingTranscripts);
    
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