import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

// Import the existing prompt services from the correct path
import {
  getAvailableTemplates,
  getTemplateContent,
  loadPromptTemplate,
  validateTemplateVariables,
  getPromptMetadata,
  getPromptDescription,
  extractTemplateVariables,
  savePromptTemplate,
  type Result
} from '../../../../api/src/services/prompts';

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  async getAllTemplates(): Promise<PromptTemplateListEntity[]> {
    this.logger.log('Getting all available prompt templates');

    const templatesResult = getAvailableTemplates();
    
    if (!templatesResult.success) {
      throw new BadRequestException('Failed to list templates');
    }

    // Build metadata for each template
    const templates = await Promise.all(
      templatesResult.data.map(async (name) => {
        try {
          // Get metadata
          const metadataResult = getPromptMetadata(name);
          const descriptionResult = getPromptDescription(name);
          const variablesResult = extractTemplateVariables(name);
          
          // Generate user-friendly title
          const title = name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          return {
            name,
            title,
            description: descriptionResult.success 
              ? descriptionResult.data.substring(0, 200) + (descriptionResult.data.length > 200 ? '...' : '')
              : 'No description available',
            variables: variablesResult.success ? variablesResult.data : [],
            lastModified: metadataResult.success && metadataResult.data.lastModified
              ? metadataResult.data.lastModified.toISOString()
              : new Date().toISOString(),
            exists: metadataResult.success ? metadataResult.data.exists : false,
            size: metadataResult.success ? metadataResult.data.size : 0
          };
        } catch (error) {
          this.logger.error(`Error processing template ${name}:`, error);
          return {
            name,
            title: name,
            description: 'Failed to load metadata',
            variables: [],
            lastModified: new Date().toISOString(),
            exists: false,
            size: 0
          };
        }
      })
    );

    return templates;
  }

  async getTemplate(templateName: string): Promise<PromptTemplateEntity> {
    this.logger.log(`Getting template: ${templateName}`);

    if (!templateName) {
      throw new BadRequestException('Template name is required');
    }

    const contentResult = getTemplateContent(templateName);
    
    if (!contentResult.success) {
      throw new NotFoundException('Template not found');
    }

    // Get additional metadata
    const metadataResult = getPromptMetadata(templateName);
    const variablesResult = extractTemplateVariables(templateName);
    const descriptionResult = getPromptDescription(templateName);

    // Generate user-friendly title
    const title = templateName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      name: templateName,
      title,
      content: contentResult.data,
      variables: variablesResult.success ? variablesResult.data : [],
      description: descriptionResult.success ? descriptionResult.data : 'No description available',
      lastModified: metadataResult.success && metadataResult.data.lastModified
        ? metadataResult.data.lastModified.toISOString()
        : new Date().toISOString(),
      exists: metadataResult.success ? metadataResult.data.exists : false,
      size: metadataResult.success ? metadataResult.data.size : 0
    };
  }

  async updateTemplate(templateName: string, updateDto: UpdatePromptTemplateDto): Promise<PromptTemplateEntity> {
    this.logger.log(`Updating template: ${templateName}`);

    if (!templateName) {
      throw new BadRequestException('Template name is required');
    }

    const saveResult = savePromptTemplate(templateName, updateDto.content);
    
    if (!saveResult.success) {
      throw new BadRequestException('Failed to update template');
    }

    // Return updated template data
    return await this.getTemplate(templateName);
  }

  async renderTemplate(templateName: string, renderDto: RenderPromptDto): Promise<RenderedPromptEntity> {
    this.logger.log(`Rendering template: ${templateName}`);

    if (!templateName) {
      throw new BadRequestException('Template name is required');
    }

    const variables = renderDto.variables || {};

    // Validate variables if requested
    const shouldValidate = renderDto.validate !== false; // Default to true
    if (shouldValidate) {
      const validationResult = validateTemplateVariables(templateName, variables);
      
      if (!validationResult.success) {
        throw new NotFoundException('Template not found');
      }

      if (!validationResult.data.isValid) {
        throw new BadRequestException(
          `Missing required variables: ${validationResult.data.missingVariables.join(', ')}`
        );
      }
    }

    // Render the template
    const renderResult = loadPromptTemplate(templateName, variables);
    
    if (!renderResult.success) {
      throw new NotFoundException('Template not found');
    }

    return {
      rendered: renderResult.data,
      templateName,
      variablesUsed: Object.keys(variables)
    };
  }

  async validateTemplate(templateName: string, validationDto: PromptValidationDto): Promise<PromptValidationEntity> {
    this.logger.log(`Validating template: ${templateName}`);

    if (!templateName) {
      throw new BadRequestException('Template name is required');
    }

    const variables: Record<string, string> = validationDto.variables || {};

    const validationResult = validateTemplateVariables(templateName, variables);
    
    if (!validationResult.success) {
      throw new NotFoundException('Template not found');
    }

    // Also get required variables for reference
    const variablesResult = extractTemplateVariables(templateName);

    return {
      isValid: validationResult.data.isValid,
      missingVariables: validationResult.data.missingVariables,
      requiredVariables: variablesResult.success ? variablesResult.data : [],
      providedVariables: Object.keys(variables)
    };
  }
}