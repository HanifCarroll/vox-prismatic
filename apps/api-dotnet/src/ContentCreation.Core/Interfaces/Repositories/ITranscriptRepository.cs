using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface ITranscriptRepository : IRepository<Transcript>
{
    Task<Transcript?> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<Transcript>> GetTranscriptsByProjectAsync(string projectId);
    Task<Transcript?> GetWithSegmentsAsync(string id);
    Task<IEnumerable<Transcript>> GetPendingTranscriptsAsync();
    Task<IEnumerable<Transcript>> GetProcessingTranscriptsAsync();
}