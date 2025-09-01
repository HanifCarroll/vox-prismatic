using ContentCreation.Core.DTOs.Transcripts;

namespace ContentCreation.Core.Interfaces;

public interface ITranscriptService
{
    Task<TranscriptDto> CreateAsync(CreateTranscriptDto dto);
    Task<List<TranscriptDto>> GetAllAsync(TranscriptFilterDto? filter = null);
    Task<TranscriptDto> GetByIdAsync(string id);
    Task<List<TranscriptDto>> GetByProjectIdAsync(string projectId);
    Task<TranscriptDto> UpdateAsync(string id, UpdateTranscriptDto dto);
    Task DeleteAsync(string id);
    Task<TranscriptStatsDto> GetStatsAsync();
    Task<List<TranscriptDto>> GetTranscriptsForProcessingAsync();
}

public interface ITranscriptStateService
{
    Task<TranscriptDto> StartProcessingAsync(string id);
    Task<TranscriptDto> MarkCleanedAsync(string id, string? cleanedContent = null);
    Task<TranscriptDto> MarkFailedAsync(string id, string errorMessage);
    Task<TranscriptDto> MarkInsightsGeneratedAsync(string id);
    Task<TranscriptDto> MarkPostsCreatedAsync(string id);
    Task<TranscriptDto> RetryProcessingAsync(string id);
    Task<bool> CanTransitionAsync(string id, TranscriptAction action);
}