using ContentCreation.Core.DTOs.Insights;

namespace ContentCreation.Core.Interfaces;

public interface IInsightService
{
    Task<InsightDto> CreateAsync(CreateInsightDto dto);
    Task<List<InsightDto>> GetAllAsync(InsightFilterDto? filter = null);
    Task<InsightDto> GetByIdAsync(string id);
    Task<List<InsightDto>> GetByTranscriptIdAsync(string transcriptId);
    Task<List<InsightDto>> GetByProjectIdAsync(string projectId);
    Task<InsightDto> UpdateAsync(string id, UpdateInsightDto dto);
    Task DeleteAsync(string id);
    Task<Dictionary<string, int>> GetStatusCountsAsync();
    Task<BulkOperationResponseDto> BulkOperationAsync(BulkInsightOperationDto dto);
}

public interface IInsightStateService
{
    Task<InsightDto> SubmitForReviewAsync(string id);
    Task<InsightDto> ApproveInsightAsync(string id, string approvedBy, int? score = null);
    Task<InsightDto> RejectInsightAsync(string id, string reviewedBy, string reason);
    Task<InsightDto> ArchiveInsightAsync(string id, string reason);
    Task<InsightDto> RestoreInsightAsync(string id);
    Task<AvailableActionsDto> GetAvailableActionsAsync(string id);
    Task<bool> CanTransitionAsync(string id, InsightAction action);
}