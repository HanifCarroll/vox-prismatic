import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromptTemplateEntity {
  @ApiProperty({
    description: 'Template filename (without .md extension)',
    example: 'generate-social-post'
  })
  name: string;

  @ApiProperty({
    description: 'Human-readable title derived from filename',
    example: 'Generate Social Post'
  })
  title: string;

  @ApiProperty({
    description: 'Template content in Markdown format',
    example: `# Generate Social Media Post

Please create a social media post based on the following insight:

**Insight**: {{insight}}

**Target Platform**: {{platform}}`
  })
  content: string;

  @ApiProperty({
    description: 'Description extracted from template content',
    example: 'Generate Social Media Post template for creating platform-specific content from insights'
  })
  description: string;

  @ApiProperty({
    description: 'Required variables found in the template',
    example: ['insight', 'platform', 'characterLimit'],
    type: [String]
  })
  variables: string[];

  @ApiProperty({
    description: 'When the template file was last modified',
    example: '2025-08-26T15:30:00.000Z'
  })
  lastModified: string;

  @ApiProperty({
    description: 'Whether the template file exists on disk',
    example: true
  })
  exists: boolean;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024
  })
  size: number;
}

// PromptTemplateListEntity now includes content, so it's the same as PromptTemplateEntity
export class PromptTemplateListEntity extends PromptTemplateEntity {
  // All properties are inherited from PromptTemplateEntity
  // No additional properties needed since we now include content in the list
}

export class RenderedPromptEntity {
  @ApiProperty({
    description: 'Rendered template content with variables substituted',
    example: `# Generate Social Media Post

Please create a social media post based on the following insight:

**Insight**: Building resilience requires developing systems...

**Target Platform**: linkedin`
  })
  rendered: string;

  @ApiProperty({
    description: 'Template name that was rendered',
    example: 'generate-social-post'
  })
  templateName: string;

  @ApiProperty({
    description: 'Variables that were used in rendering',
    example: ['insight', 'platform'],
    type: [String]
  })
  variablesUsed: string[];
}

export class PromptValidationEntity {
  @ApiProperty({
    description: 'Whether all required variables are provided',
    example: true
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Variables that are required but not provided',
    example: ['characterLimit'],
    type: [String]
  })
  missingVariables: string[];

  @ApiProperty({
    description: 'All variables required by the template',
    example: ['insight', 'platform', 'characterLimit'],
    type: [String]
  })
  requiredVariables: string[];

  @ApiProperty({
    description: 'Variables that were provided',
    example: ['insight', 'platform'],
    type: [String]
  })
  providedVariables: string[];
}