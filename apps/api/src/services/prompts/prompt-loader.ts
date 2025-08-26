import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Functional prompt loading operations for API server
 */

/**
 * Gets the absolute path to the prompts assets directory
 */
const getPromptsAssetsPath = (): string => {
	// Get the directory containing this file
	const currentFileUrl = import.meta.url;
	const currentFilePath = fileURLToPath(currentFileUrl);
	const currentDir = dirname(currentFilePath);

	// Go up to src root and into assets/prompts directory
	return join(currentDir, "..", "..", "assets", "prompts");
};

/**
 * Result type for functional error handling
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Loads and processes prompt template with variable substitution
 */
export const loadPromptTemplate = (
	templateName: string,
	variables: Record<string, string> = {},
): Result<string> => {
	const templatesPath = getPromptsAssetsPath();
	const templatePath = join(templatesPath, `${templateName}.md`);

	try {
		const template = readFileSync(templatePath, "utf-8");

		// Handle null or undefined variables
		if (!variables || typeof variables !== 'object') {
			return { success: true, data: template };
		}

		// Replace all variables in the template
		const rendered = Object.entries(variables).reduce(
			(content, [key, value]) =>
				content.replace(new RegExp(`{{${key}}}`, "g"), value),
			template,
		);

		return { success: true, data: rendered };
	} catch (error) {
		return {
			success: false,
			error: new Error(
				`Failed to load prompt template "${templateName}": ${error instanceof Error ? error.message : "Unknown error"}`,
			),
		};
	}
};

/**
 * Lists available prompt templates
 */
export const getAvailableTemplates = (): Result<string[]> => {
	const templatesPath = getPromptsAssetsPath();

	try {
		const files = readdirSync(templatesPath)
			.filter((file: string) => file.endsWith(".md"))
			.map((file: string) => file.replace(".md", ""));

		return { success: true, data: files };
	} catch (error) {
		return {
			success: false,
			error: new Error(
				`Failed to list prompt templates: ${error instanceof Error ? error.message : "Unknown error"}`,
			),
		};
	}
};

/**
 * Validates that all required variables are present in template
 */
export const validateTemplateVariables = (
	templateName: string,
	variables: Record<string, string>,
): Result<{ isValid: boolean; missingVariables: string[] }> => {
	const templatesPath = getPromptsAssetsPath();
	const templatePath = join(templatesPath, `${templateName}.md`);

	try {
		const template = readFileSync(templatePath, "utf-8");

		// Extract all variable placeholders from template
		const variableMatches = template.match(/{{(\w+)}}/g);
		const requiredVariables = variableMatches
			? [...new Set(variableMatches.map((match) => match.replace(/[{}]/g, "")))]
			: [];

		// Check which required variables are missing
		const providedVariables = Object.keys(variables);
		const missingVariables = requiredVariables.filter(
			(required) => !providedVariables.includes(required),
		);

		return {
			success: true,
			data: {
				isValid: missingVariables.length === 0,
				missingVariables,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: new Error(
				`Failed to validate template "${templateName}": ${error instanceof Error ? error.message : "Unknown error"}`,
			),
		};
	}
};

/**
 * Gets raw template content without variable substitution
 */
export const getTemplateContent = (templateName: string): Result<string> => {
	const templatesPath = getPromptsAssetsPath();
	const templatePath = join(templatesPath, `${templateName}.md`);

	try {
		const content = readFileSync(templatePath, "utf-8");
		return { success: true, data: content };
	} catch (error) {
		return {
			success: false,
			error: new Error(
				`Failed to read template "${templateName}": ${error instanceof Error ? error.message : "Unknown error"}`,
			),
		};
	}
};

/**
 * Saves a prompt template to disk
 */
export const savePromptTemplate = (
	templateName: string,
	content: string,
): Result<void> => {
	const templatesPath = getPromptsAssetsPath();
	const templatePath = join(templatesPath, `${templateName}.md`);

	try {
		// Validate template name to prevent directory traversal
		if (templateName.includes('..') || templateName.includes('/')) {
			return {
				success: false,
				error: new Error('Invalid template name')
			};
		}

		// Check if template exists
		if (!existsSync(templatePath)) {
			return {
				success: false,
				error: new Error(`Template "${templateName}" does not exist`)
			};
		}

		// Write the content to the file
		const { writeFileSync } = require("fs");
		writeFileSync(templatePath, content, "utf-8");
		
		return { success: true, data: undefined };
	} catch (error) {
		return {
			success: false,
			error: new Error(
				`Failed to save prompt template "${templateName}": ${error instanceof Error ? error.message : "Unknown error"}`,
			),
		};
	}
};

/**
 * Gets metadata for a prompt template
 */
export const getPromptMetadata = (templateName: string): Result<{
	exists: boolean;
	lastModified?: Date;
	size?: number;
}> => {
	const templatesPath = getPromptsAssetsPath();
	const templatePath = join(templatesPath, `${templateName}.md`);

	try {
		const stats = statSync(templatePath);
		return {
			success: true,
			data: {
				exists: true,
				lastModified: stats.mtime,
				size: stats.size,
			},
		};
	} catch (error) {
		return {
			success: true,
			data: {
				exists: false,
			},
		};
	}
};

/**
 * Extracts the description from a prompt template
 * Returns the first non-empty line as the description
 */
export const getPromptDescription = (templateName: string): Result<string> => {
	const result = getTemplateContent(templateName);
	
	if (!result.success) {
		return { success: false, error: result.error };
	}

	try {
		const lines = result.data.split('\n');
		const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
		return { 
			success: true, 
			data: firstNonEmptyLine || 'No description available' 
		};
	} catch (error) {
		return { 
			success: false, 
			error: new Error('Failed to extract description') 
		};
	}
};

/**
 * Extracts variables from a template
 */
export const extractTemplateVariables = (templateName: string): Result<string[]> => {
	const result = getTemplateContent(templateName);
	
	if (!result.success) {
		return { success: false, error: result.error };
	}

	try {
		// Extract all variable placeholders from template
		const variableMatches = result.data.match(/{{(\w+)}}/g);
		const variables = variableMatches
			? [...new Set(variableMatches.map((match) => match.replace(/[{}]/g, "")))]
			: [];

		return { success: true, data: variables };
	} catch (error) {
		return { 
			success: false, 
			error: new Error('Failed to extract variables') 
		};
	}
};

// Helper function for checking file existence (since we removed require)
const existsSync = (path: string): boolean => {
	try {
		statSync(path);
		return true;
	} catch {
		return false;
	}
};