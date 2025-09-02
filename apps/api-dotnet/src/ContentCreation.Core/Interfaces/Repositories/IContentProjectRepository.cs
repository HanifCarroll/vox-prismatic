using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IContentProjectRepository : IRepository<ContentProject>
{
    Task<ContentProject?> GetWithRelatedDataAsync(string id);
    Task<IEnumerable<ContentProject>> GetActiveProjectsAsync();
    Task<IEnumerable<ContentProject>> GetProjectsByUserAsync(Guid userId);
    Task<IEnumerable<ContentProject>> GetProjectsByStageAsync(string stage);
    Task<ContentProject?> GetProjectWithTranscriptsAsync(string id);
    Task<ContentProject?> GetProjectWithInsightsAsync(string id);
    Task<ContentProject?> GetProjectWithPostsAsync(string id);
    Task<ContentProject?> GetProjectWithFullDetailsAsync(string id);
    Task<int> GetActiveProjectCountAsync();
    Task<IEnumerable<ContentProject>> GetRecentProjectsAsync(int count);
}