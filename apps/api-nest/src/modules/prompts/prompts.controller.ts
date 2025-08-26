import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PromptsService } from './prompts.service';
import {
  PromptTemplateEntity,
  PromptTemplateListEntity,
  RenderedPromptEntity,
  PromptValidationEntity,
} from './entities/prompt-template.entity';
import {
  UpdatePromptTemplateDto,
  RenderPromptDto,
  PromptValidationDto,
} from './dto';

@ApiTags('Prompts')
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all prompt templates',
    description: 'Retrieve all available prompt templates with metadata including variables, descriptions, and file statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PromptTemplateListEntity' },
        },
        total: { type: 'number', example: 5 },
      },
    },
  })
  async getAllTemplates() {
    const templates = await this.promptsService.getAllTemplates();
    return { 
      success: true, 
      data: templates,
      total: templates.length
    };
  }

  @Get(':name')
  @ApiOperation({
    summary: 'Get a specific prompt template',
    description: 'Retrieve the content and metadata for a specific prompt template by name',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt template retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PromptTemplateEntity' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ 
    name: 'name', 
    description: 'Template name (without .md extension)',
    example: 'generate-social-post'
  })
  async getTemplate(@Param('name') name: string) {
    const template = await this.promptsService.getTemplate(name);
    return { 
      success: true, 
      data: template
    };
  }

  @Put(':name')
  @ApiOperation({
    summary: 'Update a prompt template',
    description: 'Update the content of an existing prompt template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PromptTemplateEntity' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template name or content',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ 
    name: 'name', 
    description: 'Template name (without .md extension)',
    example: 'generate-social-post'
  })
  @ApiBody({ type: UpdatePromptTemplateDto })
  async updateTemplate(
    @Param('name') name: string,
    @Body() updateDto: UpdatePromptTemplateDto,
  ) {
    const template = await this.promptsService.updateTemplate(name, updateDto);
    return { 
      success: true, 
      data: template
    };
  }

  @Post(':name/render')
  @ApiOperation({
    summary: 'Render a prompt template',
    description: 'Render a prompt template with provided variables, substituting placeholders with actual values',
  })
  @ApiResponse({
    status: 200,
    description: 'Template rendered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/RenderedPromptEntity' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required variables or invalid template',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ 
    name: 'name', 
    description: 'Template name (without .md extension)',
    example: 'generate-social-post'
  })
  @ApiBody({ type: RenderPromptDto })
  async renderTemplate(
    @Param('name') name: string,
    @Body() renderDto: RenderPromptDto,
  ) {
    const rendered = await this.promptsService.renderTemplate(name, renderDto);
    return { 
      success: true, 
      data: rendered
    };
  }

  @Get(':name/validate')
  @ApiOperation({
    summary: 'Validate template variables',
    description: 'Check if provided variables satisfy all requirements for a template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template validation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PromptValidationEntity' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ 
    name: 'name', 
    description: 'Template name (without .md extension)',
    example: 'generate-social-post'
  })
  @ApiQuery({ 
    name: 'variables', 
    required: false, 
    description: 'Variables to validate (JSON string)',
    example: '{"insight": "test content", "platform": "linkedin"}'
  })
  async validateTemplate(
    @Param('name') name: string,
    @Query() queryParams: { variables?: string },
  ) {
    // Parse variables from query parameter
    let variables: Record<string, string> = {};
    if (queryParams.variables) {
      try {
        variables = JSON.parse(queryParams.variables);
      } catch (error) {
        throw new Error('Invalid variables JSON format');
      }
    }

    const validationDto: PromptValidationDto = { variables };
    const validation = await this.promptsService.validateTemplate(name, validationDto);
    return { 
      success: true, 
      data: validation
    };
  }
}