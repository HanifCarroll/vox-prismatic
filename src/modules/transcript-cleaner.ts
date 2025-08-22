import prompts from 'prompts';
import { AppConfig, TranscriptPage, CleanedTranscriptPage, Result } from '../lib/types.ts';
import { createNotionClient, transcripts, cleanedTranscripts, getPageContent } from '../lib/notion.ts';
import { createAIClient, cleanTranscript } from '../lib/ai.ts';
import { display } from '../lib/io.ts';
import { saveToDebugFile, formatDuration, formatCost, formatNumber } from '../lib/utils.ts';

/**
 * Functional transcript cleaning module
 */

/**
 * Displays available transcripts and gets user selection
 */
const selectTranscriptsToClean = async (
  availableTranscripts: TranscriptPage[]
): Promise<{ transcripts: TranscriptPage[], batchMode: boolean }> => {
  if (availableTranscripts.length === 0) {
    display.info('No transcripts available for cleaning.');
    return { transcripts: [], batchMode: false };
  }

  console.log(`\n📋 Found ${availableTranscripts.length} transcript${availableTranscripts.length === 1 ? '' : 's'} ready for cleaning\n`);

  const choices = availableTranscripts.map((transcript, index) => ({
    title: transcript.title,
    description: `Created: ${new Date(transcript.createdTime).toLocaleDateString()}`,
    value: index
  }));

  choices.unshift({
    title: '🧹 Clean All Transcripts',
    description: 'Process all transcripts sequentially with prompts',
    value: 'all'
  });

  choices.unshift({
    title: '🚀 Process All Without Interruption',
    description: 'Clean all transcripts automatically without prompts',
    value: 'batch'
  });

  const response = await prompts({
    type: 'select',
    name: 'selection',
    message: 'Select transcripts to clean:',
    choices: choices
  });

  if (response.selection === undefined) {
    return { transcripts: [], batchMode: false };
  }

  const batchMode = response.selection === 'batch';
  
  if (response.selection === 'all' || response.selection === 'batch') {
    return { transcripts: availableTranscripts, batchMode };
  }

  return { transcripts: [availableTranscripts[response.selection]], batchMode: false };
};

/**
 * Cleans a single transcript
 */
const cleanSingleTranscript = async (
  transcript: TranscriptPage,
  config: AppConfig
): Promise<Result<CleanedTranscriptPage>> => {
  const startTime = Date.now();
  const notionClient = createNotionClient(config.notion);
  const { proModel } = createAIClient(config.ai);

  try {
    console.log(`\n🧹 Cleaning transcript: ${transcript.title}`);
    
    // Check if already cleaned
    const existingCleanedResult = await cleanedTranscripts.getBySourceTranscript(
      notionClient,
      config.notion,
      transcript.id
    );
    
    if (existingCleanedResult.success && existingCleanedResult.data) {
      console.log('✓ Already has a cleaned version');
      return { success: true, data: existingCleanedResult.data };
    }
    
    // Get raw content
    const contentResult = await getPageContent(notionClient, transcript.id);
    if (!contentResult.success) {
      throw contentResult.error;
    }
    
    const rawContent = contentResult.data;
    console.log(`📄 Content length: ${formatNumber(rawContent.length)} characters`);
    
    // Clean transcript using Pro model for higher quality
    console.log('🤖 Cleaning with Gemini 2.5 Pro...');
    const cleaningResult = await cleanTranscript(proModel, rawContent);
    if (!cleaningResult.success) {
      throw cleaningResult.error;
    }
    
    const { cleanedText, duration, cost } = cleaningResult.data;
    console.log(`✅ Cleaned in ${formatDuration(duration)}`);
    console.log(`💰 Cost: ${formatCost(cost)}`);
    console.log(`📉 Reduced by ${Math.round((1 - cleanedText.length / rawContent.length) * 100)}%`);
    
    // Save to Notion
    console.log('💾 Saving cleaned transcript...');
    const createResult = await cleanedTranscripts.create(
      notionClient,
      config.notion,
      transcript,
      cleanedText
    );
    
    if (!createResult.success) {
      throw createResult.error;
    }
    
    // Update original transcript status
    await transcripts.updateStatus(notionClient, transcript.id, 'Cleaned');
    
    // Save debug info
    saveToDebugFile(`cleaned-transcript-${transcript.id}`, {
      transcriptId: transcript.id,
      transcriptTitle: transcript.title,
      originalLength: rawContent.length,
      cleanedLength: cleanedText.length,
      reduction: `${Math.round((1 - cleanedText.length / rawContent.length) * 100)}%`,
      duration,
      cost,
      timestamp: new Date().toISOString()
    });
    
    const cleanedTranscript: CleanedTranscriptPage = {
      id: createResult.data,
      title: `Cleaned: ${transcript.title}`,
      status: 'Ready',
      sourceTranscriptId: transcript.id,
      createdTime: new Date().toISOString()
    };
    
    console.log(`✨ Successfully cleaned: "${transcript.title}"`);
    return { success: true, data: cleanedTranscript };
    
  } catch (error) {
    console.error(`❌ Error cleaning transcript:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Processes multiple transcripts with user interaction
 */
const processTranscriptsBatch = async (
  transcriptsToClean: TranscriptPage[],
  config: AppConfig,
  batchMode: boolean = false
): Promise<void> => {
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < transcriptsToClean.length; i++) {
    const transcript = transcriptsToClean[i];
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Processing ${i + 1}/${transcriptsToClean.length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const result = await cleanSingleTranscript(transcript, config);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Ask to continue if not the last one and not in batch mode
    if (i < transcriptsToClean.length - 1 && !batchMode) {
      const continueResponse = await prompts({
        type: 'select',
        name: 'action',
        message: 'Continue with next transcript?',
        choices: [
          {
            title: '➡️  Continue',
            description: 'Clean the next transcript',
            value: 'continue'
          },
          {
            title: '❌ Stop',
            description: 'Stop cleaning transcripts',
            value: 'stop'
          }
        ]
      });
      
      if (!continueResponse.action || continueResponse.action === 'stop') {
        break;
      }
    } else if (batchMode && i < transcriptsToClean.length - 1) {
      // In batch mode, just show progress
      console.log(`\n⏳ Continuing with next transcript (${i + 2}/${transcriptsToClean.length})...`);
    }
  }
  
  // Display summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CLEANING SESSION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Successfully cleaned: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

/**
 * Main entry point for transcript cleaning
 */
export const runTranscriptCleaner = async (config: AppConfig): Promise<void> => {
  try {
    display.info('Starting transcript cleaning system...');
    
    const notionClient = createNotionClient(config.notion);
    
    // Get transcripts that need cleaning
    const transcriptsResult = await cleanedTranscripts.getNeedsCleaning(
      notionClient,
      config.notion
    );
    
    if (!transcriptsResult.success) {
      throw transcriptsResult.error;
    }
    
    const availableTranscripts = transcriptsResult.data;
    
    if (availableTranscripts.length === 0) {
      display.success('No transcripts need cleaning! All transcripts are already processed.');
      return;
    }
    
    // Let user select which transcripts to clean
    const selection = await selectTranscriptsToClean(availableTranscripts);
    
    if (selection.transcripts.length === 0) {
      display.info('No transcripts selected. Exiting...');
      return;
    }
    
    // Process selected transcripts
    await processTranscriptsBatch(selection.transcripts, config, selection.batchMode);
    
    display.success('Transcript cleaning session completed!');
    
  } catch (error) {
    display.error(`Error in transcript cleaner: ${error}`);
    throw error;
  }
};