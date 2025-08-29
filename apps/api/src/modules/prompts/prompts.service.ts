import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Result } from '@content-creation/types';
import {
	PromptValidationDto,
	RenderPromptDto,
	UpdatePromptTemplateDto,
} from "./dto";
import {
	PromptTemplateEntity,
	PromptTemplateListEntity,
	PromptValidationEntity,
	RenderedPromptEntity,
} from "./entities/prompt-template.entity";

@Injectable()
export class PromptsService {
	private readonly logger = new Logger(PromptsService.name);
	private readonly promptsPath: string;
	private listCache?: { data: PromptTemplateListEntity[]; expiresAt: number };

	constructor() {
		// Docker working directory is /app/apps/api, assets are at src/assets/prompts
		this.promptsPath = join(process.cwd(), 'src', 'assets', 'prompts');
		
		this.logger.log(`Prompts directory set to: ${this.promptsPath}`);
	}

	/**
	 * Helper function for checking file existence
	 */
	private existsSync(path: string): boolean {
		try {
			statSync(path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Loads and processes prompt template with variable substitution
	 */
	private loadPromptTemplate(
		templateName: string,
		variables: Record<string, string> = {},
	): Result<string> {
		const templatePath = join(this.promptsPath, `${templateName}.md`);

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
	}

	/**
	 * Lists available prompt templates
	 */
	private getAvailableTemplates(): Result<string[]> {
		try {
			const files = readdirSync(this.promptsPath)
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
	}

	/**
	 * Validates that all required variables are present in template
	 */
	private validateTemplateVariables(
		templateName: string,
		variables: Record<string, string>,
	): Result<{ isValid: boolean; missingVariables: string[] }> {
		const templatePath = join(this.promptsPath, `${templateName}.md`);

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
	}

	/**
	 * Gets raw template content without variable substitution
	 */
	private getTemplateContent(templateName: string): Result<string> {
		const templatePath = join(this.promptsPath, `${templateName}.md`);

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
	}

	/**
	 * Saves a prompt template to disk
	 */
	private savePromptTemplate(
		templateName: string,
		content: string,
	): Result<void> {
		const templatePath = join(this.promptsPath, `${templateName}.md`);

		try {
			// Validate template name to prevent directory traversal
			if (templateName.includes('..') || templateName.includes('/')) {
				return {
					success: false,
					error: new Error('Invalid template name')
				};
			}

			// Check if template exists
			if (!this.existsSync(templatePath)) {
				return {
					success: false,
					error: new Error(`Template "${templateName}" does not exist`)
				};
			}

			// Write the content to the file
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
	}

	/**
	 * Gets metadata for a prompt template
	 */
	private getPromptMetadata(templateName: string): Result<{
		exists: boolean;
		lastModified?: Date;
		size?: number;
	}> {
		const templatePath = join(this.promptsPath, `${templateName}.md`);

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
	}

	/**
	 * Extracts the description from a prompt template
	 * Returns the first non-empty line as the description
	 */
	private getPromptDescription(templateName: string): Result<string> {
		const result = this.getTemplateContent(templateName);
		
		if (!result.success) {
			return { success: false, error: new Error('Failed to get template content') };
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
	}

	/**
	 * Extracts variables from a template
	 */
	private extractTemplateVariables(templateName: string): Result<string[]> {
		const result = this.getTemplateContent(templateName);
		
		if (!result.success) {
			return { success: false, error: new Error('Failed to get template content') };
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
	}

	// Public API methods

	async getAllTemplates(): Promise<PromptTemplateListEntity[]> {
		this.logger.log("Getting all available prompt templates with content");

		// Return cached list if available and not expired
		if (this.listCache && this.listCache.expiresAt > Date.now()) {
			return this.listCache.data;
		}

		// Read directory asynchronously
		let files: string[] = [];
		try {
			files = await readdir(this.promptsPath);
		} catch (error) {
			this.logger.error("Failed to list prompt templates", error as Error);
			throw new BadRequestException("Failed to list templates");
		}

		const names = files
			.filter((file: string) => file.endsWith(".md"))
			.map((file: string) => file.replace(".md", ""));

		const templates = await Promise.all(
			names.map(async (name) => {
				const templatePath = join(this.promptsPath, `${name}.md`);
				try {
					const [content, stats] = await Promise.all([
						readFile(templatePath, "utf-8"),
						stat(templatePath).catch(() => null),
					]);

					const title = name
						.split("-")
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(" ");

					// First non-empty line as description, clamped to 200 chars
					const firstNonEmptyLine = content
						.split("\n")
						.find((line) => line.trim().length > 0) || "No description available";
					const trimmed = firstNonEmptyLine.trim();
					const description = trimmed.length > 200 ? `${trimmed.substring(0, 200)}...` : trimmed;

					// Extract variables from content
					const variableMatches = content.match(/{{(\w+)}}/g);
					const variables = variableMatches
						? [...new Set(variableMatches.map((match) => match.replace(/[{}]/g, "")))]
						: [];

					return {
						name,
						title,
						content,
						description,
						variables,
						lastModified: (stats as any)?.mtime?.toISOString?.() ?? new Date().toISOString(),
						exists: !!stats,
						size: (stats as any)?.size ?? 0,
					};
				} catch (error) {
					this.logger.error(`Error processing template ${name}: ${error instanceof Error ? error.message : String(error)}`);
					return {
						name,
						title: name,
						content: "",
						description: "Failed to load metadata",
						variables: [],
						lastModified: new Date().toISOString(),
						exists: false,
						size: 0,
					};
				}
			}),
		);

		// Cache for 60 seconds
		this.listCache = { data: templates, expiresAt: Date.now() + 60_000 };
		return templates;
	}

	async getTemplate(templateName: string): Promise<PromptTemplateEntity> {
		this.logger.log(`Getting template: ${templateName}`);

		if (!templateName) {
			throw new BadRequestException("Template name is required");
		}

		const contentResult = this.getTemplateContent(templateName);

		if (!contentResult.success) {
			throw new NotFoundException("Template not found");
		}

		// Get additional metadata
		const metadataResult = this.getPromptMetadata(templateName);
		const variablesResult = this.extractTemplateVariables(templateName);
		const descriptionResult = this.getPromptDescription(templateName);

		// Generate user-friendly title
		const title = templateName
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

		return {
			name: templateName,
			title,
			content: contentResult.data,
			variables: variablesResult.success ? variablesResult.data : [],
			description: descriptionResult.success
				? descriptionResult.data
				: "No description available",
			lastModified:
				metadataResult.success && metadataResult.data.lastModified
					? metadataResult.data.lastModified.toISOString()
					: new Date().toISOString(),
			exists: metadataResult.success ? metadataResult.data.exists : false,
			size: metadataResult.success ? metadataResult.data.size : 0,
		};
	}

	async updateTemplate(
		templateName: string,
		updateDto: UpdatePromptTemplateDto,
	): Promise<PromptTemplateEntity> {
		this.logger.log(`Updating template: ${templateName}`);

		if (!templateName) {
			throw new BadRequestException("Template name is required");
		}

		const saveResult = this.savePromptTemplate(templateName, updateDto.content);

		if (!saveResult.success) {
			throw new BadRequestException("Failed to update template");
		}

		// Invalidate list cache so next list request is fresh
		this.listCache = undefined;

		// Return updated template data
		return await this.getTemplate(templateName);
	}

	async renderTemplate(
		templateName: string,
		renderDto: RenderPromptDto,
	): Promise<RenderedPromptEntity> {
		this.logger.log(`Rendering template: ${templateName}`);

		if (!templateName) {
			throw new BadRequestException("Template name is required");
		}

		const variables = renderDto.variables || {};

		// Validate variables if requested
		const shouldValidate = renderDto.validate !== false; // Default to true
		if (shouldValidate) {
			const validationResult = this.validateTemplateVariables(
				templateName,
				variables,
			);

			if (!validationResult.success) {
				throw new NotFoundException("Template not found");
			}

			if (!validationResult.data.isValid) {
				throw new BadRequestException(
					`Missing required variables: ${validationResult.data.missingVariables.join(", ")}`,
				);
			}
		}

		// Render the template
		const renderResult = this.loadPromptTemplate(templateName, variables);

		if (!renderResult.success) {
			throw new NotFoundException("Template not found");
		}

		return {
			rendered: renderResult.data,
			templateName,
			variablesUsed: Object.keys(variables),
		};
	}

	async validateTemplate(
		templateName: string,
		validationDto: PromptValidationDto,
	): Promise<PromptValidationEntity> {
		this.logger.log(`Validating template: ${templateName}`);

		if (!templateName) {
			throw new BadRequestException("Template name is required");
		}

		const variables: Record<string, string> = validationDto.variables || {};

		const validationResult = this.validateTemplateVariables(templateName, variables);

		if (!validationResult.success) {
			throw new NotFoundException("Template not found");
		}

		// Also get required variables for reference
		const variablesResult = this.extractTemplateVariables(templateName);

		return {
			isValid: validationResult.data.isValid,
			missingVariables: validationResult.data.missingVariables,
			requiredVariables: variablesResult.success ? variablesResult.data : [],
			providedVariables: Object.keys(variables),
		};
	}
}