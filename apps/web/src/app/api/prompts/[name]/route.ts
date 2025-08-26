import { NextRequest, NextResponse } from 'next/server';
import { fetchPromptContent, updatePromptTemplate } from '@/lib/prompts/api-client';

// GET /api/prompts/[name] - Get specific prompt content using API client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: promptName } = await params;
    
    // Use the API client to fetch prompt content
    const data = await fetchPromptContent(promptName);
    
    // Add title if not present
    if (!data.title) {
      data.title = promptName
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Failed to get prompt:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return NextResponse.json(
          {
            success: false,
            error: 'Prompt template not found'
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve prompt template'
      },
      { status: 500 }
    );
  }
}

// PUT /api/prompts/[name] - Update prompt content using API client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: promptName } = await params;
    const body = await request.json();
    
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid content provided'
        },
        { status: 400 }
      );
    }
    
    // Use the API client to update the prompt
    const result = await updatePromptTemplate(promptName, body.content);
    
    // Extract variables from the content for the response
    const variableMatches = body.content.match(/{{(\w+)}}/g);
    const variables = variableMatches
      ? [...new Set(variableMatches.map((match: string) => match.replace(/[{}]/g, '')))]
      : [];
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        variables
      }
    });
  } catch (error) {
    console.error('Failed to update prompt:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return NextResponse.json(
          {
            success: false,
            error: 'Prompt template not found'
          },
          { status: 404 }
        );
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update prompt template'
      },
      { status: 500 }
    );
  }
}