using ContentCreation.Api.Features.Transcripts.DTOs;

namespace ContentCreation.Api.Features.Transcripts.Interfaces;

public interface ITranscriptService
{
    Task<IEnumerable<TranscriptDto>> GetAllAsync();
    Task<TranscriptDto?> GetByIdAsync(Guid id);
    Task<TranscriptDto> CreateAsync(CreateTranscriptDto dto);
    Task<TranscriptDto?> UpdateAsync(Guid id, UpdateTranscriptDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<Insights.DTOs.InsightDto>> GetInsightsAsync(Guid transcriptId);
}