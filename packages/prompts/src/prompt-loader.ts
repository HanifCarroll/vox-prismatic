import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Functional prompt loading operations
 */

/**
 * Gets the absolute path to the prompts package
 */
const getPromptsPackagePath = (): string => {
	// Get the directory containing this file
	const currentFileUrl = import.meta.url;
	const currentFilePath = fileURLToPath(currentFileUrl);
	const currentDir = dirname(currentFilePath);

	// Go up to the package root and into templates directory
	return join(currentDir, "..", "templates");
};

/**
 * Loads and processes prompt template with variable substitution
 * Moved from @content-creation/ai package for better organization
 */
export const loadPromptTemplate = (
	templateName: string,
	variables: Record<string, string>,
): string => {
	const templatesPath = getPromptsPackagePath();
	const templatePath = join(templatesPath, `${templateName}.md`);

	try {
		const template = readFileSync(templatePath, "utf-8");

		// Handle null or undefined variables
		if (!variables || typeof variables !== 'object') {
			return template;
		}

		// Replace all variables in the template
		return Object.entries(variables).reduce(
			(content, [key, value]) =>
				content.replace(new RegExp(`{{${key}}}`, "g"), value),
			template,
		);
	} catch (error) {
		throw new Error(
			`Failed to load prompt template "${templateName}": ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Lists available prompt templates
 */
export const getAvailableTemplates = (): string[] => {
	const templatesPath = getPromptsPackagePath();
	const fs = require("fs");

	try {
		return fs
			.readdirSync(templatesPath)
			.filter((file: string) => file.endsWith(".md"))
			.map((file: string) => file.replace(".md", ""));
	} catch (error) {
		throw new Error(
			`Failed to list prompt templates: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Validates that all required variables are present in template
 */
export const validateTemplateVariables = (
	templateName: string,
	variables: Record<string, string>,
): { isValid: boolean; missingVariables: string[] } => {
	const templatesPath = getPromptsPackagePath();
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
			isValid: missingVariables.length === 0,
			missingVariables,
		};
	} catch (error) {
		throw new Error(
			`Failed to validate template "${templateName}": ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};
