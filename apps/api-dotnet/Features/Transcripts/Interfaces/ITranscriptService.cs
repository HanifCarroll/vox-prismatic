using ContentCreation.Api.Features.Transcripts.DTOs;

namespace ContentCreation.Api.Features.Transcripts.Interfaces;

public interface ITranscriptService
{
    Task<IEnumerable<TranscriptDto>> GetAllAsync();
    Task<TranscriptDto?> GetByIdAsync(string id);
    Task<TranscriptDto> CreateAsync(CreateTranscriptDto dto);
    Task<TranscriptDto?> UpdateAsync(string id, UpdateTranscriptDto dto);
    Task<bool> DeleteAsync(string id);
    Task<IEnumerable<Insights.DTOs.InsightDto>> GetInsightsAsync(string transcriptId);
}