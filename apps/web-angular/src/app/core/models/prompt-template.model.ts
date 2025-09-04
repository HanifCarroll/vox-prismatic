// PromptTemplate model that matches TRD specification exactly

export enum PromptType {
  INSIGHT = 'insight',
  POST = 'post'
}

export interface PromptTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: PromptType;
  template: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromptTemplateRequest {
  name: string;
  description: string;
  type: PromptType;
  template: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePromptTemplateRequest {
  name?: string;
  description?: string;
  template?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface PromptTemplateFilter {
  type?: PromptType;
  isActive?: boolean;
  isDefault?: boolean;
  searchTerm?: string;
}

// Template rendering
export interface PromptRenderResult {
  renderedTemplate: string;
  usedVariables: Record<string, string>;
}

export interface PromptRenderRequest {
  templateId: string;
  variables: Record<string, string>;
}

// Template validation
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedVariables: string[];
}