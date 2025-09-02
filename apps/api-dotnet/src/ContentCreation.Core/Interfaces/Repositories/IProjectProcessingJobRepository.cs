using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IProjectProcessingJobRepository : IRepository<ProjectProcessingJob>
{
    Task<IEnumerable<ProjectProcessingJob>> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<ProjectProcessingJob>> GetPendingJobsAsync();
    Task<IEnumerable<ProjectProcessingJob>> GetByJobTypeAsync(string jobType);
    Task<ProjectProcessingJob?> GetActiveJobForProjectAsync(string projectId);
}