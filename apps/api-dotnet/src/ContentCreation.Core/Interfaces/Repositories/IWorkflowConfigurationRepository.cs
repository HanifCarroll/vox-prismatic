using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IWorkflowConfigurationRepository : IRepository<WorkflowConfiguration>
{
    Task<WorkflowConfiguration?> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<WorkflowConfiguration>> GetActiveConfigurationsAsync();
}