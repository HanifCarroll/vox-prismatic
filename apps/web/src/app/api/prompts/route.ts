import { NextResponse } from 'next/server';
import { fetchPromptTemplates } from '@/lib/prompts/api-client';

export async function GET() {
  try {
    // Proxy request to the API server
    const prompts = await fetchPromptTemplates();
    
    return NextResponse.json({
      success: true,
      data: prompts,
      total: prompts.length
    });
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list prompt templates'
      },
      { status: 500 }
    );
  }
}