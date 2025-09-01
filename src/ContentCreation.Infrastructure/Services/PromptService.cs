using ContentCreation.Core.DTOs.Prompts;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ContentCreation.Infrastructure.Services;

public class PromptService : IPromptService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PromptService> _logger;
    private readonly IMemoryCache _cache;
    private readonly IAIService _aiService;
    
    private const string TEMPLATE_CACHE_KEY = "prompt_template_{0}";
    private const string DEFAULT_TEMPLATE_KEY = "prompt_default_{0}";

    public PromptService(
        ApplicationDbContext context,
        ILogger<PromptService> logger,
        IMemoryCache cache,
        IAIService aiService)
    {
        _context = context;
        _logger = logger;
        _cache = cache;
        _aiService = aiService;
    }

    public async Task<PromptTemplateDto> CreateTemplateAsync(CreatePromptTemplateDto dto)
    {
        // If making default, unset other defaults in same category
        if (dto.MakeDefault)
        {
            var existingDefaults = await _context.PromptTemplates
                .Where(t => t.Category == dto.Category && t.IsDefault)
                .ToListAsync();
            
            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
            }
        }
        
        var template = new PromptTemplate
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Category = dto.Category,
            Status = PromptStatus.Active,
            Model = dto.Model,
            Template = dto.Template,
            VariablesJson = JsonSerializer.Serialize(dto.Variables),
            ModelParametersJson = dto.ModelParameters != null ? JsonSerializer.Serialize(dto.ModelParameters) : null,
            Version = 1,
            IsDefault = dto.MakeDefault,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UsageCount = 0,
            SuccessCount = 0,
            FailureCount = 0
        };
        
        _context.PromptTemplates.Add(template);
        await _context.SaveChangesAsync();
        
        // Clear cache
        if (dto.MakeDefault)
        {
            _cache.Remove(string.Format(DEFAULT_TEMPLATE_KEY, dto.Category));
        }
        
        _logger.LogInformation("Created prompt template {TemplateId} with name {Name}", template.Id, template.Name);
        
        return MapToDto(template);
    }

    public async Task<PromptTemplateDto?> GetTemplateByIdAsync(Guid id)
    {
        var cacheKey = string.Format(TEMPLATE_CACHE_KEY, id);
        
        if (_cache.TryGetValue<PromptTemplateDto>(cacheKey, out var cached))
            return cached;
        
        var template = await _context.PromptTemplates.FindAsync(id);
        if (template == null)
            return null;
        
        var dto = MapToDto(template);
        _cache.Set(cacheKey, dto, TimeSpan.FromMinutes(10));
        
        return dto;
    }

    public async Task<List<PromptTemplateDto>> GetTemplatesAsync(PromptFilterDto filter)
    {
        var query = _context.PromptTemplates.AsQueryable();
        
        if (filter.Category.HasValue)
            query = query.Where(t => t.Category == filter.Category.Value);
        
        if (filter.Status.HasValue)
            query = query.Where(t => t.Status == filter.Status.Value);
        
        if (filter.Model.HasValue)
            query = query.Where(t => t.Model == filter.Model.Value);
        
        if (filter.IsDefault.HasValue)
            query = query.Where(t => t.IsDefault == filter.IsDefault.Value);
        
        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.ToLower();
            query = query.Where(t => 
                t.Name.ToLower().Contains(searchTerm) ||
                t.Description.ToLower().Contains(searchTerm) ||
                t.Template.ToLower().Contains(searchTerm));
        }
        
        var templates = await query
            .OrderByDescending(t => t.IsDefault)
            .ThenByDescending(t => t.UpdatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();
        
        return templates.Select(MapToDto).ToList();
    }

    public async Task<PromptTemplateDto?> GetDefaultTemplateAsync(PromptCategory category)
    {
        var cacheKey = string.Format(DEFAULT_TEMPLATE_KEY, category);
        
        if (_cache.TryGetValue<PromptTemplateDto>(cacheKey, out var cached))
            return cached;
        
        var template = await _context.PromptTemplates
            .FirstOrDefaultAsync(t => t.Category == category && t.IsDefault && t.Status == PromptStatus.Active);
        
        if (template == null)
        {
            // Fallback to any active template in category
            template = await _context.PromptTemplates
                .FirstOrDefaultAsync(t => t.Category == category && t.Status == PromptStatus.Active);
        }
        
        if (template == null)
            return null;
        
        var dto = MapToDto(template);
        _cache.Set(cacheKey, dto, TimeSpan.FromMinutes(30));
        
        return dto;
    }

    public async Task<PromptTemplateDto?> UpdateTemplateAsync(Guid id, UpdatePromptTemplateDto dto)
    {
        var template = await _context.PromptTemplates.FindAsync(id);
        if (template == null)
            return null;
        
        if (!string.IsNullOrEmpty(dto.Name))
            template.Name = dto.Name;
        
        if (!string.IsNullOrEmpty(dto.Description))
            template.Description = dto.Description;
        
        if (dto.Status.HasValue)
            template.Status = dto.Status.Value;
        
        if (!string.IsNullOrEmpty(dto.Template))
        {
            template.Template = dto.Template;
            template.Version++;
        }
        
        if (dto.Variables != null)
            template.VariablesJson = JsonSerializer.Serialize(dto.Variables);
        
        if (dto.ModelParameters != null)
            template.ModelParametersJson = JsonSerializer.Serialize(dto.ModelParameters);
        
        if (dto.MakeDefault.HasValue && dto.MakeDefault.Value)
        {
            // Unset other defaults in same category
            var existingDefaults = await _context.PromptTemplates
                .Where(t => t.Category == template.Category && t.IsDefault && t.Id != id)
                .ToListAsync();
            
            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
            }
            
            template.IsDefault = true;
            _cache.Remove(string.Format(DEFAULT_TEMPLATE_KEY, template.Category));
        }
        
        template.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        // Clear cache
        _cache.Remove(string.Format(TEMPLATE_CACHE_KEY, id));
        
        _logger.LogInformation("Updated prompt template {TemplateId}", id);
        
        return MapToDto(template);
    }

    public async Task<bool> DeleteTemplateAsync(Guid id)
    {
        var template = await _context.PromptTemplates.FindAsync(id);
        if (template == null)
            return false;
        
        _context.PromptTemplates.Remove(template);
        await _context.SaveChangesAsync();
        
        // Clear cache
        _cache.Remove(string.Format(TEMPLATE_CACHE_KEY, id));
        if (template.IsDefault)
        {
            _cache.Remove(string.Format(DEFAULT_TEMPLATE_KEY, template.Category));
        }
        
        _logger.LogInformation("Deleted prompt template {TemplateId}", id);
        
        return true;
    }

    public async Task<PromptTemplateDto> CloneTemplateAsync(ClonePromptTemplateDto dto)
    {
        var source = await _context.PromptTemplates.FindAsync(dto.SourceTemplateId);
        if (source == null)
            throw new InvalidOperationException($"Source template {dto.SourceTemplateId} not found");
        
        var clone = new PromptTemplate
        {
            Id = Guid.NewGuid(),
            Name = dto.NewName,
            Description = dto.NewDescription ?? $"Cloned from {source.Name}",
            Category = source.Category,
            Status = dto.MakeActive ? PromptStatus.Active : PromptStatus.Draft,
            Model = source.Model,
            Template = source.Template,
            VariablesJson = source.VariablesJson,
            ModelParametersJson = source.ModelParametersJson,
            Version = 1,
            IsDefault = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UsageCount = 0,
            SuccessCount = 0,
            FailureCount = 0
        };
        
        _context.PromptTemplates.Add(clone);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Cloned template {SourceId} to {CloneId}", dto.SourceTemplateId, clone.Id);
        
        return MapToDto(clone);
    }

    public async Task<PromptTemplateDto> CreateNewVersionAsync(Guid templateId, string updatedTemplate)
    {
        var current = await _context.PromptTemplates.FindAsync(templateId);
        if (current == null)
            throw new InvalidOperationException($"Template {templateId} not found");
        
        current.Template = updatedTemplate;
        current.Version++;
        current.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        // Clear cache
        _cache.Remove(string.Format(TEMPLATE_CACHE_KEY, templateId));
        
        return MapToDto(current);
    }

    public async Task<List<PromptTemplateDto>> GetTemplateVersionsAsync(Guid templateId)
    {
        // In a real implementation, you'd store version history
        // For now, just return the current version
        var template = await _context.PromptTemplates.FindAsync(templateId);
        if (template == null)
            return new List<PromptTemplateDto>();
        
        return new List<PromptTemplateDto> { MapToDto(template) };
    }

    public async Task<bool> RollbackToVersionAsync(Guid templateId, int version)
    {
        // In a real implementation, you'd restore from version history
        _logger.LogWarning("Version rollback not fully implemented for template {TemplateId}", templateId);
        return false;
    }

    public async Task<RenderPromptResultDto> RenderPromptAsync(RenderPromptDto dto)
    {
        var template = await GetTemplateByIdAsync(dto.TemplateId);
        if (template == null)
            throw new InvalidOperationException($"Template {dto.TemplateId} not found");
        
        if (dto.ValidateVariables)
        {
            var isValid = await ValidateVariablesAsync(dto.TemplateId, dto.Variables);
            if (!isValid)
                throw new InvalidOperationException("Variable validation failed");
        }
        
        var renderedPrompt = RenderTemplate(template.Template, dto.Variables);
        
        return new RenderPromptResultDto
        {
            RenderedPrompt = renderedPrompt,
            TemplateId = template.Id,
            TemplateName = template.Name,
            TemplateVersion = template.Version,
            UsedVariables = dto.Variables,
            Warnings = new List<string>()
        };
    }

    public async Task<RenderPromptResultDto> RenderPromptWithDefaultsAsync(PromptCategory category, Dictionary<string, object> variables)
    {
        var template = await GetDefaultTemplateAsync(category);
        if (template == null)
            throw new InvalidOperationException($"No default template found for category {category}");
        
        return await RenderPromptAsync(new RenderPromptDto
        {
            TemplateId = template.Id,
            Variables = variables,
            ValidateVariables = true
        });
    }

    public async Task<bool> ValidateVariablesAsync(Guid templateId, Dictionary<string, object> variables)
    {
        var template = await GetTemplateByIdAsync(templateId);
        if (template == null)
            return false;
        
        foreach (var variable in template.Variables)
        {
            if (variable.Required && !variables.ContainsKey(variable.Name))
            {
                _logger.LogWarning("Required variable {Variable} missing for template {TemplateId}", 
                    variable.Name, templateId);
                return false;
            }
            
            if (variables.TryGetValue(variable.Name, out var value))
            {
                // Validate type
                if (!ValidateVariableType(value, variable.Type))
                {
                    _logger.LogWarning("Variable {Variable} has invalid type for template {TemplateId}", 
                        variable.Name, templateId);
                    return false;
                }
                
                // Validate allowed values
                if (variable.AllowedValues != null && variable.AllowedValues.Any())
                {
                    if (!variable.AllowedValues.Contains(value?.ToString() ?? ""))
                    {
                        _logger.LogWarning("Variable {Variable} has invalid value for template {TemplateId}", 
                            variable.Name, templateId);
                        return false;
                    }
                }
                
                // Validate pattern
                if (!string.IsNullOrEmpty(variable.ValidationPattern))
                {
                    var regex = new Regex(variable.ValidationPattern);
                    if (!regex.IsMatch(value?.ToString() ?? ""))
                    {
                        _logger.LogWarning("Variable {Variable} doesn't match pattern for template {TemplateId}", 
                            variable.Name, templateId);
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    public async Task<TestPromptResultDto> TestPromptAsync(TestPromptDto dto)
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            var renderResult = await RenderPromptAsync(new RenderPromptDto
            {
                TemplateId = dto.TemplateId,
                Variables = dto.Variables,
                ValidateVariables = true
            });
            
            string? aiResponse = null;
            if (dto.ExecutePrompt)
            {
                // Actually call the AI service
                // This is a simplified version - you'd need to route to the appropriate method
                aiResponse = await _aiService.GenerateSummaryAsync(renderResult.RenderedPrompt);
            }
            
            var executionTime = DateTime.UtcNow - startTime;
            
            return new TestPromptResultDto
            {
                RenderedPrompt = renderResult.RenderedPrompt,
                AiResponse = aiResponse,
                Success = true,
                ExecutionTime = executionTime,
                Metadata = new Dictionary<string, object>
                {
                    ["templateVersion"] = renderResult.TemplateVersion,
                    ["variableCount"] = dto.Variables.Count
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to test prompt template {TemplateId}", dto.TemplateId);
            
            return new TestPromptResultDto
            {
                RenderedPrompt = "",
                Success = false,
                Error = ex.Message,
                ExecutionTime = DateTime.UtcNow - startTime
            };
        }
    }

    public async Task<List<TestPromptResultDto>> BatchTestAsync(Guid templateId, List<Dictionary<string, object>> testCases)
    {
        var results = new List<TestPromptResultDto>();
        
        foreach (var testCase in testCases)
        {
            var result = await TestPromptAsync(new TestPromptDto
            {
                TemplateId = templateId,
                Variables = testCase,
                ExecutePrompt = false
            });
            results.Add(result);
        }
        
        return results;
    }

    public async Task<List<PromptHistoryDto>> GetHistoryAsync(Guid? templateId = null, string? userId = null, int days = 30)
    {
        var cutoff = DateTime.UtcNow.AddDays(-days);
        var query = _context.PromptHistory
            .Include(h => h.Template)
            .Where(h => h.ExecutedAt >= cutoff);
        
        if (templateId.HasValue)
            query = query.Where(h => h.TemplateId == templateId.Value);
        
        if (!string.IsNullOrEmpty(userId))
            query = query.Where(h => h.UserId == userId);
        
        var history = await query
            .OrderByDescending(h => h.ExecutedAt)
            .Take(100)
            .ToListAsync();
        
        return history.Select(h => new PromptHistoryDto
        {
            Id = h.Id,
            TemplateId = h.TemplateId,
            TemplateName = h.Template.Name,
            TemplateVersion = h.TemplateVersion,
            RenderedPrompt = h.RenderedPrompt,
            Variables = string.IsNullOrEmpty(h.VariablesJson) 
                ? new Dictionary<string, object>()
                : JsonSerializer.Deserialize<Dictionary<string, object>>(h.VariablesJson) ?? new Dictionary<string, object>(),
            Response = h.Response,
            Success = h.Success,
            ExecutionTime = TimeSpan.FromMilliseconds(h.ExecutionTimeMs),
            ExecutedAt = h.ExecutedAt,
            UserId = h.UserId,
            ProjectId = h.ProjectId
        }).ToList();
    }

    public async Task RecordUsageAsync(Guid templateId, string renderedPrompt, Dictionary<string, object> variables, 
        string? response, bool success, TimeSpan executionTime, string? userId = null, Guid? projectId = null)
    {
        var history = new PromptHistory
        {
            Id = Guid.NewGuid(),
            TemplateId = templateId,
            TemplateVersion = 1, // Would need to track this properly
            RenderedPrompt = renderedPrompt,
            VariablesJson = JsonSerializer.Serialize(variables),
            Response = response,
            Success = success,
            ExecutionTimeMs = (long)executionTime.TotalMilliseconds,
            ExecutedAt = DateTime.UtcNow,
            UserId = userId,
            ProjectId = projectId
        };
        
        _context.PromptHistory.Add(history);
        
        // Update template stats
        var template = await _context.PromptTemplates.FindAsync(templateId);
        if (template != null)
        {
            template.UsageCount++;
            if (success)
                template.SuccessCount++;
            else
                template.FailureCount++;
        }
        
        await _context.SaveChangesAsync();
    }

    public async Task<PromptStatsDto> GetTemplateStatsAsync(Guid templateId)
    {
        var template = await _context.PromptTemplates.FindAsync(templateId);
        if (template == null)
            throw new InvalidOperationException($"Template {templateId} not found");
        
        var history = await _context.PromptHistory
            .Where(h => h.TemplateId == templateId)
            .ToListAsync();
        
        return new PromptStatsDto
        {
            TemplateId = template.Id,
            TemplateName = template.Name,
            TotalUsage = template.UsageCount,
            SuccessfulExecutions = template.SuccessCount,
            FailedExecutions = template.FailureCount,
            SuccessRate = template.UsageCount > 0 ? (double)template.SuccessCount / template.UsageCount : 0,
            AverageExecutionTime = history.Any() 
                ? TimeSpan.FromMilliseconds(history.Average(h => h.ExecutionTimeMs))
                : TimeSpan.Zero,
            LastUsedAt = history.MaxBy(h => h.ExecutedAt)?.ExecutedAt
        };
    }

    public async Task<Dictionary<PromptCategory, PromptStatsDto>> GetCategoryStatsAsync()
    {
        var templates = await _context.PromptTemplates.ToListAsync();
        var stats = new Dictionary<PromptCategory, PromptStatsDto>();
        
        foreach (var category in Enum.GetValues<PromptCategory>())
        {
            var categoryTemplates = templates.Where(t => t.Category == category).ToList();
            if (categoryTemplates.Any())
            {
                stats[category] = new PromptStatsDto
                {
                    TemplateName = category.ToString(),
                    TotalUsage = categoryTemplates.Sum(t => t.UsageCount),
                    SuccessfulExecutions = categoryTemplates.Sum(t => t.SuccessCount),
                    FailedExecutions = categoryTemplates.Sum(t => t.FailureCount),
                    SuccessRate = categoryTemplates.Sum(t => t.UsageCount) > 0 
                        ? (double)categoryTemplates.Sum(t => t.SuccessCount) / categoryTemplates.Sum(t => t.UsageCount)
                        : 0
                };
            }
        }
        
        return stats;
    }

    public async Task InitializeDefaultTemplatesAsync()
    {
        var existingDefaults = await _context.PromptTemplates.AnyAsync(t => t.IsDefault);
        if (existingDefaults)
            return;
        
        var defaultTemplates = GetDefaultTemplates();
        
        foreach (var template in defaultTemplates)
        {
            _context.PromptTemplates.Add(template);
        }
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Initialized {Count} default prompt templates", defaultTemplates.Count);
    }

    public async Task<bool> ResetToDefaultsAsync(PromptCategory? category = null)
    {
        var query = _context.PromptTemplates.AsQueryable();
        
        if (category.HasValue)
            query = query.Where(t => t.Category == category.Value);
        
        var templates = await query.ToListAsync();
        _context.PromptTemplates.RemoveRange(templates);
        
        var defaultTemplates = GetDefaultTemplates();
        if (category.HasValue)
            defaultTemplates = defaultTemplates.Where(t => t.Category == category.Value).ToList();
        
        foreach (var template in defaultTemplates)
        {
            _context.PromptTemplates.Add(template);
        }
        
        await _context.SaveChangesAsync();
        
        // Clear all cache
        // In production, you'd want to be more selective
        
        return true;
    }

    public async Task<List<PromptTemplateDto>> ImportTemplatesAsync(string jsonContent)
    {
        var templates = JsonSerializer.Deserialize<List<CreatePromptTemplateDto>>(jsonContent);
        if (templates == null)
            throw new InvalidOperationException("Invalid JSON content");
        
        var imported = new List<PromptTemplateDto>();
        
        foreach (var template in templates)
        {
            var created = await CreateTemplateAsync(template);
            imported.Add(created);
        }
        
        return imported;
    }

    public async Task<string> ExportTemplatesAsync(PromptCategory? category = null)
    {
        var query = _context.PromptTemplates.AsQueryable();
        
        if (category.HasValue)
            query = query.Where(t => t.Category == category.Value);
        
        var templates = await query.ToListAsync();
        var dtos = templates.Select(MapToDto).ToList();
        
        return JsonSerializer.Serialize(dtos, new JsonSerializerOptions { WriteIndented = true });
    }

    public async Task<int> ArchiveUnusedTemplatesAsync(int unusedDays = 90)
    {
        var cutoff = DateTime.UtcNow.AddDays(-unusedDays);
        
        var unusedTemplates = await _context.PromptTemplates
            .Where(t => t.UpdatedAt < cutoff && t.UsageCount == 0 && !t.IsDefault)
            .ToListAsync();
        
        foreach (var template in unusedTemplates)
        {
            template.Status = PromptStatus.Archived;
        }
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Archived {Count} unused templates", unusedTemplates.Count);
        
        return unusedTemplates.Count;
    }

    private PromptTemplateDto MapToDto(PromptTemplate template)
    {
        return new PromptTemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Status = template.Status,
            Model = template.Model,
            Template = template.Template,
            Variables = string.IsNullOrEmpty(template.VariablesJson)
                ? new List<PromptVariableDto>()
                : JsonSerializer.Deserialize<List<PromptVariableDto>>(template.VariablesJson) ?? new List<PromptVariableDto>(),
            ModelParameters = string.IsNullOrEmpty(template.ModelParametersJson)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, object>>(template.ModelParametersJson),
            Version = template.Version,
            IsDefault = template.IsDefault,
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
            CreatedBy = template.CreatedBy,
            SuccessRate = template.UsageCount > 0 ? (double)template.SuccessCount / template.UsageCount : 0,
            UsageCount = template.UsageCount
        };
    }

    private string RenderTemplate(string template, Dictionary<string, object> variables)
    {
        var rendered = template;
        
        foreach (var variable in variables)
        {
            var placeholder = $"{{{{{variable.Key}}}}}";
            var value = variable.Value?.ToString() ?? "";
            rendered = rendered.Replace(placeholder, value);
        }
        
        return rendered;
    }

    private bool ValidateVariableType(object value, string expectedType)
    {
        return expectedType.ToLower() switch
        {
            "string" => value is string,
            "number" => value is int or long or float or double or decimal,
            "boolean" => value is bool,
            "array" => value is IEnumerable<object>,
            _ => true
        };
    }

    private List<PromptTemplate> GetDefaultTemplates()
    {
        return new List<PromptTemplate>
        {
            new PromptTemplate
            {
                Id = Guid.NewGuid(),
                Name = "Default Transcript Cleaning",
                Description = "Standard template for cleaning raw transcripts",
                Category = PromptCategory.TranscriptCleaning,
                Status = PromptStatus.Active,
                Model = PromptModel.GeminiPro,
                Template = @"Clean and format the following transcript. Remove filler words, fix grammar, 
add proper punctuation, and organize into clear paragraphs. Maintain the original 
meaning and key points while making it more readable.

Transcript:
{{content}}

Cleaned transcript:",
                VariablesJson = JsonSerializer.Serialize(new List<PromptVariableDto>
                {
                    new PromptVariableDto { Name = "content", Description = "Raw transcript content", Type = "string", Required = true }
                }),
                Version = 1,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new PromptTemplate
            {
                Id = Guid.NewGuid(),
                Name = "Default Insight Extraction",
                Description = "Standard template for extracting insights from content",
                Category = PromptCategory.InsightExtraction,
                Status = PromptStatus.Active,
                Model = PromptModel.GeminiPro,
                Template = @"Extract {{count}} key insights from the following content. Each insight should be:
1. A standalone valuable point or idea
2. Actionable or thought-provoking
3. Suitable for social media posts

Content:
{{content}}

Return the insights in JSON format with Title, Summary, Category, and Tags.

Insights:",
                VariablesJson = JsonSerializer.Serialize(new List<PromptVariableDto>
                {
                    new PromptVariableDto { Name = "content", Description = "Content to extract insights from", Type = "string", Required = true },
                    new PromptVariableDto { Name = "count", Description = "Number of insights to extract", Type = "number", Required = true, DefaultValue = 5 }
                }),
                Version = 1,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new PromptTemplate
            {
                Id = Guid.NewGuid(),
                Name = "Default Post Generation",
                Description = "Standard template for generating social media posts",
                Category = PromptCategory.PostGeneration,
                Status = PromptStatus.Active,
                Model = PromptModel.GeminiPro,
                Template = @"Create a {{platform}} post based on this insight.

Insight:
{{insight}}

Platform guidelines:
{{guidelines}}

Return the post in JSON format with Title, Content, and Hashtags fields.

Post:",
                VariablesJson = JsonSerializer.Serialize(new List<PromptVariableDto>
                {
                    new PromptVariableDto { Name = "platform", Description = "Target platform", Type = "string", Required = true },
                    new PromptVariableDto { Name = "insight", Description = "Insight to base post on", Type = "string", Required = true },
                    new PromptVariableDto { Name = "guidelines", Description = "Platform-specific guidelines", Type = "string", Required = false }
                }),
                Version = 1,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };
    }
}