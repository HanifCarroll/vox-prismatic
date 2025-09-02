using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class TranscriptRepository : Repository<Transcript>, ITranscriptRepository
{
    public TranscriptRepository(ApplicationDbContext context) : base(context) { }

    public async Task<Transcript?> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(t => t.ProjectId == projectId);
    }

    public async Task<IEnumerable<Transcript>> GetTranscriptsByProjectAsync(string projectId)
    {
        return await _dbSet
            .Where(t => t.ProjectId == projectId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<Transcript?> GetWithSegmentsAsync(string id)
    {
        return await _dbSet
            .FirstOrDefaultAsync(t => t.Id == id.ToString());
    }

    public async Task<IEnumerable<Transcript>> GetPendingTranscriptsAsync()
    {
        return await _dbSet
            .Where(t => t.Status == "pending")
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transcript>> GetProcessingTranscriptsAsync()
    {
        return await _dbSet
            .Where(t => t.Status == "processing")
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
    }
}