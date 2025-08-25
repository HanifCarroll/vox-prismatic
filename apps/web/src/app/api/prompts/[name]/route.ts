import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

// GET /api/prompts/[name] - Get specific prompt content
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const promptName = params.name;
    
    // Validate prompt name to prevent directory traversal
    if (promptName.includes('..') || promptName.includes('/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid prompt name'
        },
        { status: 400 }
      );
    }
    
    // Build the file path
    const filePath = join(process.cwd(), '../../packages/prompts/templates', `${promptName}.md`);
    
    try {
      // Read the prompt content
      const content = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);
      
      // Extract variables
      const variableMatches = content.match(/{{(\w+)}}/g);
      const variables = variableMatches
        ? [...new Set(variableMatches.map(match => match.replace(/[{}]/g, '')))]
        : [];
      
      // Extract description (first paragraph)
      const lines = content.split('\n');
      const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
      const description = firstNonEmptyLine || 'No description available';
      
      // Generate title
      const title = promptName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return NextResponse.json({
        success: true,
        data: {
          name: promptName,
          title,
          description,
          content,
          variables,
          lastModified: stats.mtime.toISOString()
        }
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt template not found'
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get prompt:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve prompt template'
      },
      { status: 500 }
    );
  }
}

// PUT /api/prompts/[name] - Update prompt content
export async function PUT(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const promptName = params.name;
    
    // Validate prompt name to prevent directory traversal
    if (promptName.includes('..') || promptName.includes('/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid prompt name'
        },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { content } = body;
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid content provided'
        },
        { status: 400 }
      );
    }
    
    // Build the file path
    const filePath = join(process.cwd(), '../../packages/prompts/templates', `${promptName}.md`);
    
    try {
      // Check if file exists
      await stat(filePath);
      
      // Write the updated content
      await writeFile(filePath, content, 'utf-8');
      
      // Extract variables from new content
      const variableMatches = content.match(/{{(\w+)}}/g);
      const variables = variableMatches
        ? [...new Set(variableMatches.map(match => match.replace(/[{}]/g, '')))]
        : [];
      
      return NextResponse.json({
        success: true,
        data: {
          name: promptName,
          variables,
          message: 'Prompt updated successfully'
        }
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt template not found or cannot be updated'
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to update prompt:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update prompt template'
      },
      { status: 500 }
    );
  }
}