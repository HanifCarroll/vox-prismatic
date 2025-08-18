import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface InsightPage {
  id: string;
  title: string;
  score: number;
  status: string;
  postType: string;
  category?: string;
  summary?: string;
  verbatimQuote?: string;
}

interface GeneratedPost {
  linkedinPost: string;
  xPost: string;
  softCTA: string;
  directCTA: string;
}

class PostGenerator {
  private notion: Client;
  private genAI: GoogleGenerativeAI;
  private proModel: any;

  constructor() {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY is required');
    }
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }
    if (!process.env.NOTION_INSIGHTS_DATABASE_ID) {
      throw new Error('NOTION_INSIGHTS_DATABASE_ID is required');
    }
    if (!process.env.NOTION_POSTS_DATABASE_ID) {
      throw new Error('NOTION_POSTS_DATABASE_ID is required');
    }

    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.proModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    // Create debug folder if it doesn't exist
    try {
      mkdirSync('debug', { recursive: true });
    } catch (error) {
      // Folder already exists, ignore
    }
  }

  async getReadyInsights(): Promise<InsightPage[]> {
    console.log('🔍 Fetching insights ready for post generation...');
    
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_INSIGHTS_DATABASE_ID!,
      filter: {
        property: 'Status',
        select: {
          equals: 'Ready for Posts'
        }
      },
      sorts: [
        {
          property: 'Score',
          direction: 'descending'
        }
      ]
    });

    const insights = response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      score: page.properties.Score?.number || 0,
      status: page.properties.Status?.select?.name || 'Unknown',
      postType: page.properties['Post Type']?.select?.name || 'Unknown',
      summary: page.properties.Summary?.rich_text?.[0]?.plain_text || '',
      verbatimQuote: page.properties['Verbatim Quote']?.rich_text?.[0]?.plain_text || ''
    }));

    console.log(`📊 Found ${insights.length} insights ready for posts`);
    insights.forEach((insight, index) => {
      console.log(`  ${index + 1}. "${insight.title}" (Score: ${insight.score})`);
    });

    return insights;
  }

  async getInsightContent(insightId: string): Promise<string> {
    console.log(`📄 Fetching full content for insight: ${insightId}`);
    
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await this.notion.blocks.children.list({
        block_id: insightId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const block of response.results) {
        const fullBlock = block as BlockObjectResponse;
        if (fullBlock.type === 'paragraph' && 'paragraph' in fullBlock && fullBlock.paragraph.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\\n';
        } else if (fullBlock.type === 'quote' && 'quote' in fullBlock && fullBlock.quote.rich_text) {
          content += '> ' + fullBlock.quote.rich_text.map((text: any) => text.plain_text).join('') + '\\n';
        } else if (fullBlock.type === 'numbered_list_item' && 'numbered_list_item' in fullBlock && fullBlock.numbered_list_item.rich_text) {
          content += '- ' + fullBlock.numbered_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\\n';
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    console.log(`📝 Extracted ${content.length} characters of insight content`);
    return content;
  }

  async generatePosts(insight: InsightPage): Promise<GeneratedPost> {
    console.log(`🤖 Generating posts for: "${insight.title}"`);
    
    // Get the full insight content including hooks
    const fullContent = await this.getInsightContent(insight.id);
    
    const postGenerationPrompt = `
You are an expert content creator specializing in writing for bootstrapped SaaS founders. Your tone is direct, pragmatic, and authoritative, based on the Voice & Style Guide provided.

Your task is to take a structured "Content Insight" and generate a LinkedIn post and an X post from it.

---
## 1. Voice & Style Guide (Follow these rules):

Your primary goal is to write posts from the perspective of a confident and experienced product and UI/UX strategist. Your audience consists of tech founders, product managers, and engineers. The tone should be concise, helpful, and authoritative without being arrogant. Every post must provide a clear, actionable insight.

Structural Rules
1. The Hook (First Paragraph)
You must begin every post with one of these three hook structures:

The Intriguing Question: Start by posing a direct question that addresses a common pain point for founders or product builders. (e.g., "Your first 100 users are giving you feedback. How do you decide what to build next without derailing your entire roadmap?")

The Anecdotal Story: Begin with a short, relevant narrative about a past observation or experience. (e.g., "I once watched a founder spend six months building a feature only three people used. Here's the mistake they made.")

The Statement of Position: Open with a bold, declarative statement that establishes a strong point of view. (e.g., "Most product backlogs are a graveyard of good intentions.")

2. The Body
The body of the post must be structured to be highly scannable and deliver value quickly.

Flow: Follow a clear Problem -> Insight -> Solution logical progression.

Lists: When explaining a process or a set of principles, use bulleted or numbered lists to break down the information into digestible points.

Emphasis on "Why": Do not just state what to do. Always explain the strategic reasoning or the why behind the advice.

3. The Conclusion
End the post with a strong, memorable takeaway.

Rule: Always end with a powerful, declarative statement. This statement should summarize the core message of the post and leave the reader with a clear principle to apply.

Example: "Stop building a feature list. Start solving problems."

Stylistic Rules
Paragraphs: This is the most important rule. Keep paragraphs extremely short, averaging 1-2 sentences. Frequently use single-sentence paragraphs for emphasis and impact. Maximize white space.

Sentences: Use clear, direct, and concise sentences. Avoid complex clauses and filler words.

Technical Language:

Use: Industry-standard terms and acronyms that your audience (founders, PMs) will know (e.g., MVP, SaaS, UI/UX, Lean, roadmap).

Avoid: Deeply specialized or esoteric jargon. If a less common tool or concept is mentioned, briefly qualify it with its purpose (e.g., "...using Figma for rapid prototyping...").

Formatting: Use bolding on key phrases to guide the reader's eye and improve scannability. End the post with 3-4 relevant hashtags.

What to Avoid
🚫 Verbosity: Do not write long, dense paragraphs. Be ruthless in cutting unnecessary words.

🚫 Tentative Language: Do not use phrases like "I think," "it seems like," or "I'm still learning." Write as a confident expert.

🚫 Vague Advice: All insights must be practical and actionable.

Conclusion Rule: 
End with an authoritative statement by default, especially for Framework and Proof posts. You may end a Problem-focused post with an open-ended question when the primary goal is to spark a community discussion around a shared pain point.

Factual Integrity Rule: 
All claims, numbers, and outcomes mentioned in the post must be directly supported by the provided Content Insight. Do not embellish, exaggerate, or invent statistics for dramatic effect. The post must remain factually anchored to the source material.

---
## 2. Content Insight To Use (This is the source material):

**Title:** ${insight.title}
**Post Type:** ${insight.postType}
**Score:** ${insight.score}
**Summary:** ${insight.summary}
**Verbatim Quote:** ${insight.verbatimQuote}

**Full Content:**
${fullContent}

---
## 3. Task:

Based on the Voice & Style Guide and the Content Insight, generate the following:

**A. LinkedIn Post Draft:**
- **Hook:** Choose the strongest hook from the insight, or write a new one that fits the voice.
- **Body:** Briefly explain the problem and the transformation. Use short paragraphs and lots of white space.
- **Takeaway:** End with a single, memorable sentence that summarizes the lesson.
- **CTA:** Provide two versions for the call to action:
    - **Soft CTA (Question):** Asks a question to encourage comments.
    - **Direct CTA (Statement):** Invites them to book a call to fix this problem.

**B. X Post (Single Tweet) Draft:**
- **Format:** Make it punchy, direct, and under 280 characters. State the core idea in the bluntest way possible.
- **Hashtags:** Use 1-2 relevant hashtags like #SaaS #bootstrapped.

**Format your response exactly like this:**

---LINKEDIN POST---
[LinkedIn post content here]

**Soft CTA:** [Question version]
**Direct CTA:** [Statement version]

---X POST---
[X post content here]

---END---
`;

    console.log('🚀 Sending to Gemini 2.5 Pro for post generation...');
    const startTime = Date.now();
    
    try {
      const result = await this.proModel.generateContent(postGenerationPrompt, {
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        }
      });
      const response = await result.response;
      const text = response.text();
      
      const duration = Date.now() - startTime;
      console.log(`⏱️  Post generation completed in ${duration}ms`);
      
      // Save AI response to debug file
      writeFileSync(join('debug', `post-generation-${Date.now()}.txt`), text);
      console.log('💾 Saved post generation response to debug folder');
      
      return this.parsePosts(text);
      
    } catch (error) {
      console.error('❌ Error during post generation:', error);
      throw error;
    }
  }

  parsePosts(response: string): GeneratedPost {
    const linkedinMatch = response.match(/---LINKEDIN POST---(.*?)(?:\*\*Soft CTA:\*\*|---X POST---|$)/s);
    const softCTAMatch = response.match(/\*\*Soft CTA:\*\*(.*?)(?:\*\*Direct CTA:\*\*|---X POST---|$)/s);
    const directCTAMatch = response.match(/\*\*Direct CTA:\*\*(.*?)(?:---X POST---|$)/s);
    const xPostMatch = response.match(/---X POST---(.*?)(?:---END---|$)/s);

    return {
      linkedinPost: linkedinMatch?.[1]?.trim() || 'Failed to parse LinkedIn post',
      xPost: xPostMatch?.[1]?.trim() || 'Failed to parse X post',
      softCTA: softCTAMatch?.[1]?.trim() || 'What\'s your experience with this?',
      directCTA: directCTAMatch?.[1]?.trim() || 'Need help with this? Let\'s talk.'
    };
  }

  async createPostPage(insight: InsightPage, generatedPost: GeneratedPost, platform: 'LinkedIn' | 'X'): Promise<void> {
    const postContent = platform === 'LinkedIn' ? generatedPost.linkedinPost : generatedPost.xPost;
    const title = `${platform === 'LinkedIn' ? 'LI' : 'X'} - ${insight.title}`;
    
    console.log(`📝 Creating ${platform} post: "${title}"`);
    
    await this.notion.pages.create({
      parent: {
        database_id: process.env.NOTION_POSTS_DATABASE_ID!
      },
      properties: {
        'Title': {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        'Platform': {
          select: {
            name: platform
          }
        },
        'Status': {
          select: {
            name: 'Draft'
          }
        },
        'Source Insight': {
          relation: [
            {
              id: insight.id
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: postContent
                }
              }
            ]
          }
        },
        ...(platform === 'LinkedIn' ? [
          {
            object: 'block' as const,
            type: 'heading_3' as const,
            heading_3: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: 'Call to Action Options'
                  }
                }
              ]
            }
          },
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: `**Soft CTA:** ${generatedPost.softCTA}`
                  }
                }
              ]
            }
          },
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: `**Direct CTA:** ${generatedPost.directCTA}`
                  }
                }
              ]
            }
          }
        ] : [])
      ]
    });
  }

  async updateInsightStatus(insightId: string, status: string): Promise<void> {
    console.log(`🔄 Updating insight status to: ${status}`);
    
    await this.notion.pages.update({
      page_id: insightId,
      properties: {
        'Status': {
          select: {
            name: status
          }
        }
      }
    });
  }

  async generatePostsFromInsights(testMode: boolean = false): Promise<void> {
    console.log('🚀 Starting post generation from insights...');
    
    try {
      const readyInsights = await this.getReadyInsights();
      
      if (readyInsights.length === 0) {
        console.log('❌ No insights found with status "Ready for Posts"');
        return;
      }

      // In test mode, process only the first insight
      const insightsToProcess = testMode ? readyInsights.slice(0, 1) : readyInsights;
      
      if (testMode) {
        console.log('🧪 TEST MODE: Processing only the highest-scoring insight');
      }

      for (const insight of insightsToProcess) {
        console.log(`\n📋 Processing insight: "${insight.title}"`);
        
        try {
          const generatedPost = await this.generatePosts(insight);
          
          // Create LinkedIn post
          await this.createPostPage(insight, generatedPost, 'LinkedIn');
          
          // Create X post  
          await this.createPostPage(insight, generatedPost, 'X');
          
          // Update insight status
          await this.updateInsightStatus(insight.id, 'Posts Drafted');
          
          console.log(`✅ Successfully created posts for: "${insight.title}"`);
          
        } catch (error) {
          console.error(`❌ Error processing insight "${insight.title}":`, error);
        }
      }
      
      console.log('\n🎉 Post generation completed!');
      
    } catch (error) {
      console.error('❌ Fatal error in post generation:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    const generator = new PostGenerator();
    
    // Check for test mode flag
    const testMode = process.argv.includes('--test') || process.argv.includes('-t');
    
    await generator.generatePostsFromInsights(testMode);
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}