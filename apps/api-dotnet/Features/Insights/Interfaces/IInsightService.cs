using ContentCreation.Api.Features.Insights.DTOs;

namespace ContentCreation.Api.Features.Insights.Interfaces;

public interface IInsightService
{
    Task<IEnumerable<InsightDto>> GetAllAsync();
    Task<InsightDto?> GetByIdAsync(string id);
    Task<InsightDto> GetInsightByIdAsync(string id);
    Task<IEnumerable<InsightDto>> GetByTranscriptIdAsync(string transcriptId);
    Task<(List<InsightDto> items, int totalCount)> GetInsightsAsync(InsightFilterDto filter);
    Task<List<InsightDto>> GetInsightsByIdsAsync(List<string> ids);
    Task<InsightDto> CreateAsync(CreateInsightDto dto);
    Task<InsightDto> CreateInsightAsync(CreateInsightDto dto);
    Task<InsightDto?> UpdateAsync(string id, UpdateInsightDto dto);
    Task<InsightDto> UpdateInsightAsync(string id, UpdateInsightDto dto);
    Task<List<InsightDto>> BulkUpdateInsightsAsync(BulkUpdateInsightsDto dto);
    Task<bool> DeleteAsync(string id);
    Task DeleteInsightAsync(string id);
    Task<InsightDto?> MarkAsReviewedAsync(string id);
}