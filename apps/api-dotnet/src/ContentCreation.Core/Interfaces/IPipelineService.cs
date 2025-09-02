using ContentCreation.Core.DTOs;

namespace ContentCreation.Core.Interfaces;

public interface IPipelineService
{
    Task<bool> TransitionToStageAsync(string projectId, string targetStage, string? userId = null);
    Task<bool> ValidateStageTransitionAsync(string projectId, string targetStage);
    Task UpdateProgressAsync(string projectId, int progress, string? message = null);
    Task<PipelineStatusDto> GetPipelineStatusAsync(string projectId);
    Task RecordStageActivityAsync(string projectId, string stage, string activityType, string? description = null, string? userId = null);
    Task<List<string>> GetAllowedTransitionsAsync(string projectId);
    Task<bool> IsStageCompleteAsync(string projectId, string stage);
}