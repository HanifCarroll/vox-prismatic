import { Hono } from 'hono';
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
} from '../services/prompts';

const prompts = new Hono();

/**
 * GET /prompts - List all available prompt templates with metadata
 */
prompts.get('/', async (c) => {
  try {
    const templatesResult = getAvailableTemplates();
    
    if (!templatesResult.success) {
      throw templatesResult.error;
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
              ? descriptionResult.data.substring(0, 200) 
              : 'No description available',
            variables: variablesResult.success ? variablesResult.data : [],
            lastModified: metadataResult.success && metadataResult.data.lastModified
              ? metadataResult.data.lastModified.toISOString()
              : new Date().toISOString(),
            exists: metadataResult.success ? metadataResult.data.exists : false,
            size: metadataResult.success ? metadataResult.data.size : 0
          };
        } catch (error) {
          console.error(`Error processing template ${name}:`, error);
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

    return c.json({ 
      success: true, 
      data: templates,
      total: templates.length
    });
  } catch (error) {
    console.error('Failed to list prompt templates:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list templates' 
      },
      500
    );
  }
});

/**
 * GET /prompts/:name - Get a specific prompt template content
 */
prompts.get('/:name', async (c) => {
  try {
    const templateName = c.req.param('name');
    
    if (!templateName) {
      return c.json(
        { success: false, error: 'Template name is required' },
        400
      );
    }

    const contentResult = getTemplateContent(templateName);
    
    if (!contentResult.success) {
      if (contentResult.error.message.includes('ENOENT') || 
          contentResult.error.message.includes('does not exist')) {
        return c.json(
          { success: false, error: 'Template not found' },
          404
        );
      }
      throw contentResult.error;
    }

    // Get additional metadata
    const metadataResult = getPromptMetadata(templateName);
    const variablesResult = extractTemplateVariables(templateName);
    const descriptionResult = getPromptDescription(templateName);

    return c.json({ 
      success: true, 
      data: {
        name: templateName,
        content: contentResult.data,
        variables: variablesResult.success ? variablesResult.data : [],
        description: descriptionResult.success ? descriptionResult.data : 'No description available',
        lastModified: metadataResult.success && metadataResult.data.lastModified
          ? metadataResult.data.lastModified.toISOString()
          : new Date().toISOString(),
        size: metadataResult.success ? metadataResult.data.size : 0
      }
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get template' 
      },
      500
    );
  }
});

/**
 * POST /prompts/:name/render - Render a prompt template with variables
 */
prompts.post('/:name/render', async (c) => {
  try {
    const templateName = c.req.param('name');
    
    if (!templateName) {
      return c.json(
        { success: false, error: 'Template name is required' },
        400
      );
    }

    const body = await c.req.json();
    const variables = body.variables || {};

    // Validate variables if requested
    const shouldValidate = body.validate !== false; // Default to true
    if (shouldValidate) {
      const validationResult = validateTemplateVariables(templateName, variables);
      
      if (!validationResult.success) {
        throw validationResult.error;
      }

      if (!validationResult.data.isValid) {
        return c.json(
          { 
            success: false, 
            error: 'Missing required variables',
            missingVariables: validationResult.data.missingVariables
          },
          400
        );
      }
    }

    // Render the template
    const renderResult = loadPromptTemplate(templateName, variables);
    
    if (!renderResult.success) {
      if (renderResult.error.message.includes('ENOENT') || 
          renderResult.error.message.includes('does not exist')) {
        return c.json(
          { success: false, error: 'Template not found' },
          404
        );
      }
      throw renderResult.error;
    }

    return c.json({ 
      success: true, 
      data: {
        rendered: renderResult.data,
        templateName,
        variablesUsed: Object.keys(variables)
      }
    });
  } catch (error) {
    console.error('Failed to render template:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to render template' 
      },
      500
    );
  }
});

/**
 * GET /prompts/:name/validate - Validate variables for a template
 */
prompts.get('/:name/validate', async (c) => {
  try {
    const templateName = c.req.param('name');
    const variablesParam = c.req.query('variables');
    
    if (!templateName) {
      return c.json(
        { success: false, error: 'Template name is required' },
        400
      );
    }

    let variables: Record<string, string> = {};
    if (variablesParam) {
      try {
        variables = JSON.parse(variablesParam);
      } catch (error) {
        return c.json(
          { success: false, error: 'Invalid variables JSON format' },
          400
        );
      }
    }

    const validationResult = validateTemplateVariables(templateName, variables);
    
    if (!validationResult.success) {
      if (validationResult.error.message.includes('ENOENT') || 
          validationResult.error.message.includes('does not exist')) {
        return c.json(
          { success: false, error: 'Template not found' },
          404
        );
      }
      throw validationResult.error;
    }

    // Also get required variables for reference
    const variablesResult = extractTemplateVariables(templateName);

    return c.json({ 
      success: true, 
      data: {
        isValid: validationResult.data.isValid,
        missingVariables: validationResult.data.missingVariables,
        requiredVariables: variablesResult.success ? variablesResult.data : [],
        providedVariables: Object.keys(variables)
      }
    });
  } catch (error) {
    console.error('Failed to validate template:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to validate template' 
      },
      500
    );
  }
});

/**
 * PUT /prompts/:name - Update a prompt template content
 */
prompts.put('/:name', async (c) => {
  try {
    const templateName = c.req.param('name');
    const body = await c.req.json();
    
    if (!templateName) {
      return c.json(
        { success: false, error: 'Template name is required' },
        400
      );
    }

    if (!body.content || typeof body.content !== 'string') {
      return c.json(
        { success: false, error: 'Template content is required' },
        400
      );
    }

    const saveResult = savePromptTemplate(templateName, body.content);
    
    if (!saveResult.success) {
      if (saveResult.error.message.includes('does not exist')) {
        return c.json(
          { success: false, error: 'Template not found' },
          404
        );
      }
      if (saveResult.error.message.includes('Invalid template name')) {
        return c.json(
          { success: false, error: 'Invalid template name' },
          400
        );
      }
      throw saveResult.error;
    }

    // Get updated metadata
    const metadataResult = getPromptMetadata(templateName);
    const variablesResult = extractTemplateVariables(templateName);

    return c.json({ 
      success: true, 
      data: {
        name: templateName,
        message: 'Template updated successfully',
        variables: variablesResult.success ? variablesResult.data : [],
        lastModified: metadataResult.success && metadataResult.data.lastModified
          ? metadataResult.data.lastModified.toISOString()
          : new Date().toISOString(),
        size: metadataResult.success ? metadataResult.data.size : 0
      }
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update template' 
      },
      500
    );
  }
});

export default prompts;