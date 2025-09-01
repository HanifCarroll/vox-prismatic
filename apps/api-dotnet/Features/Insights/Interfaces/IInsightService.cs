using ContentCreation.Api.Features.Insights.DTOs;

namespace ContentCreation.Api.Features.Insights.Interfaces;

public interface IInsightService
{
    Task<IEnumerable<InsightDto>> GetAllAsync();
    Task<InsightDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<InsightDto>> GetByTranscriptIdAsync(Guid transcriptId);
    Task<InsightDto> CreateAsync(CreateInsightDto dto);
    Task<InsightDto?> UpdateAsync(Guid id, UpdateInsightDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<InsightDto?> MarkAsReviewedAsync(Guid id);
}