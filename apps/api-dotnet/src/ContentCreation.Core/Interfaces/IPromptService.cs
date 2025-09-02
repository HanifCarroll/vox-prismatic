using ContentCreation.Core.DTOs.Prompts;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Interfaces;

public interface IPromptService
{
    // Template Management
    Task<PromptTemplateDto> CreateTemplateAsync(CreatePromptTemplateDto dto);
    Task<PromptTemplateDto?> GetTemplateByIdAsync(Guid id);
    Task<List<PromptTemplateDto>> GetTemplatesAsync(PromptFilterDto filter);
    Task<PromptTemplateDto?> GetDefaultTemplateAsync(PromptCategory category);
    Task<PromptTemplateDto?> UpdateTemplateAsync(Guid id, UpdatePromptTemplateDto dto);
    Task<bool> DeleteTemplateAsync(Guid id);
    Task<PromptTemplateDto> CloneTemplateAsync(ClonePromptTemplateDto dto);
    
    // Template Versioning
    Task<PromptTemplateDto> CreateNewVersionAsync(Guid templateId, string updatedTemplate);
    Task<List<PromptTemplateDto>> GetTemplateVersionsAsync(Guid templateId);
    Task<bool> RollbackToVersionAsync(Guid templateId, int version);
    
    // Prompt Rendering
    Task<RenderPromptResultDto> RenderPromptAsync(RenderPromptDto dto);
    Task<RenderPromptResultDto> RenderPromptWithDefaultsAsync(PromptCategory category, Dictionary<string, object> variables);
    Task<bool> ValidateVariablesAsync(Guid templateId, Dictionary<string, object> variables);
    
    // Testing
    Task<TestPromptResultDto> TestPromptAsync(TestPromptDto dto);
    Task<List<TestPromptResultDto>> BatchTestAsync(Guid templateId, List<Dictionary<string, object>> testCases);
    
    // History & Analytics
    Task<List<PromptHistoryDto>> GetHistoryAsync(Guid? templateId = null, string? userId = null, int days = 30);
    Task RecordUsageAsync(Guid templateId, string renderedPrompt, Dictionary<string, object> variables, 
        string? response, bool success, TimeSpan executionTime, string? userId = null, Guid? projectId = null);
    Task<PromptStatsDto> GetTemplateStatsAsync(Guid templateId);
    Task<Dictionary<PromptCategory, PromptStatsDto>> GetCategoryStatsAsync();
    
    // Default Templates
    Task InitializeDefaultTemplatesAsync();
    Task<bool> ResetToDefaultsAsync(PromptCategory? category = null);
    
    // Bulk Operations
    Task<List<PromptTemplateDto>> ImportTemplatesAsync(string jsonContent);
    Task<string> ExportTemplatesAsync(PromptCategory? category = null);
    Task<int> ArchiveUnusedTemplatesAsync(int unusedDays = 90);
}