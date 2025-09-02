using ContentCreation.Core.DTOs.Pipeline;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Interfaces;

public interface IContentPipelineService
{
    Task<string> StartPipelineAsync(StartPipelineDto request);
    Task<PipelineStatusDto> GetPipelineStatusAsync(Guid projectId);
    Task<PipelineResultDto> GetPipelineResultAsync(Guid projectId);
    Task<bool> SubmitReviewAsync(PipelineReviewDto review);
    Task<bool> CancelPipelineAsync(CancelPipelineDto request);
    Task<string> RetryPipelineAsync(RetryPipelineDto request);
    Task<List<PipelineStatusDto>> GetActivePipelinesAsync();
    Task ProcessPipelineAsync(Guid projectId);
}