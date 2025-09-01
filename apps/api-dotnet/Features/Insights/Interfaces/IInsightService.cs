using ContentCreation.Api.Features.Insights.DTOs;

namespace ContentCreation.Api.Features.Insights.Interfaces;

public interface IInsightService
{
    Task<IEnumerable<InsightDto>> GetAllAsync();
    Task<InsightDto?> GetByIdAsync(string id);
    Task<IEnumerable<InsightDto>> GetByTranscriptIdAsync(string transcriptId);
    Task<InsightDto> CreateAsync(CreateInsightDto dto);
    Task<InsightDto?> UpdateAsync(string id, UpdateInsightDto dto);
    Task<bool> DeleteAsync(string id);
    Task<InsightDto?> MarkAsReviewedAsync(string id);
}