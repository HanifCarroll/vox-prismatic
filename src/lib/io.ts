import * as readline from 'readline';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

/**
 * Functional interface for user input/output operations
 */

/**
 * Creates a readline interface
 */
export const createReadlineInterface = (): readline.Interface => 
  readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

/**
 * Asks a question and returns the user's response
 */
export const askQuestion = (rl: readline.Interface) => (question: string): Promise<string> =>
  new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });

/**
 * Safely closes a readline interface
 */
export const closeReadlineInterface = (rl: readline.Interface): void => {
  try {
    rl.close();
  } catch (error) {
    // Interface already closed, ignore
  }
};

/**
 * Displays formatted console output
 */
export const display = {
  welcome: (title: string, subtitle: string): void => {
    console.clear();
    console.log(`🚀 ${title}`);
    console.log('═'.repeat(title.length + 2));
    console.log(subtitle);
    console.log();
  },
  
  section: (title: string): void => {
    console.log(`\n📋 ${title}`);
    console.log('─'.repeat(title.length + 2));
  },
  
  success: (message: string): void => {
    console.log(`✅ ${message}`);
  },
  
  error: (message: string): void => {
    console.log(`❌ ${message}`);
  },
  
  info: (message: string): void => {
    console.log(`ℹ️  ${message}`);
  },
  
  separator: (): void => {
    console.log('═'.repeat(80));
  },
  
  line: (): void => {
    console.log('─'.repeat(80));
  }
};

/**
 * Launches external editor for text editing
 */
export const editWithExternalEditor = async (content: string): Promise<string | null> => {
  const tempFile = `/tmp/edit-${Date.now()}.txt`;
  
  try {
    writeFileSync(tempFile, content);
    
    console.log('\n📝 Opening content in your default editor...');
    console.log('💡 Edit the content, then save and close the editor to continue.');
    
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
    
    await new Promise<void>((resolve, reject) => {
      const editorProcess = spawn(editor, [tempFile], { 
        stdio: 'inherit',
        shell: true 
      });
      
      editorProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      
      editorProcess.on('error', (error) => {
        reject(error);
      });
    });

    const editedContent = readFileSync(tempFile, 'utf-8');
    unlinkSync(tempFile);
    
    console.log('\n✅ Content edited successfully!');
    return editedContent;
    
  } catch (error) {
    console.error('❌ Error during editing:', error);
    try {
      unlinkSync(tempFile);
    } catch {}
    return null;
  }
};

/**
 * Gets inline text input from user
 */
export const getInlineTextInput = (rl: readline.Interface, prompt: string): Promise<string> => {
  console.log(`\n${prompt}`);
  console.log('Enter your content (type "END" on a new line when finished):');
  
  return new Promise((resolve) => {
    let content = '';
    const lineReader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });
    
    lineReader.prompt();
    
    lineReader.on('line', (line) => {
      if (line.trim() === 'END') {
        lineReader.close();
        resolve(content.trim());
      } else {
        content += line + '\n';
        lineReader.prompt();
      }
    });
    
    lineReader.on('close', () => {
      resolve(content.trim() || '');
    });
  });
};