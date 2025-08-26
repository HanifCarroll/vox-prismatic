import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromptTemplateDto {
  @ApiProperty({
    description: 'Template content in Markdown format with variable placeholders',
    example: `# Generate Social Media Post

Please create a social media post based on the following insight:

**Insight**: {{insight}}

**Target Platform**: {{platform}}

Requirements:
- Keep it engaging and professional
- Include relevant hashtags
- Maximum {{characterLimit}} characters

Generate the post content:`
  })
  @IsString()
  @MinLength(1, { message: 'Template content cannot be empty' })
  content: string;
}