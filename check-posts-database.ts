import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabaseProperties() {
  if (!process.env.NOTION_API_KEY) {
    console.error('❌ Missing NOTION_API_KEY');
    process.exit(1);
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    
    // Check Content Posts database if available
    if (process.env.NOTION_POSTS_DATABASE_ID) {
      console.log('🔍 Checking Content Posts database properties...\n');
      
      const postsDb = await notion.databases.retrieve({
        database_id: process.env.NOTION_POSTS_DATABASE_ID
      });
      
      console.log(`📊 Database: ${postsDb.title?.[0]?.plain_text || 'Untitled'}\n`);
      console.log('Available properties:');
      
      Object.entries(postsDb.properties).forEach(([key, prop]) => {
        console.log(`  - "${key}" (${prop.type})`);
      });
    } else {
      console.log('⚠️  NOTION_POSTS_DATABASE_ID not set in .env file');
      console.log('Please add this to your .env file to continue');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

if (import.meta.main) {
  checkDatabaseProperties();
}