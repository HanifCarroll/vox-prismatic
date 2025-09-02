using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class PromptTemplateRepository : Repository<PromptTemplate>, IPromptTemplateRepository
{
    public PromptTemplateRepository(ApplicationDbContext context) : base(context) { }

    public async Task<PromptTemplate?> GetByNameAsync(string name)
    {
        return await _dbSet
            .FirstOrDefaultAsync(pt => pt.Name == name);
    }

    public async Task<IEnumerable<PromptTemplate>> GetActiveTemplatesAsync()
    {
        return await _dbSet
            .Where(pt => pt.Status == PromptStatus.Active)
            .OrderBy(pt => pt.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<PromptTemplate>> GetByCategoryAsync(string category)
    {
        if (!Enum.TryParse<PromptCategory>(category, out var categoryEnum))
        {
            return new List<PromptTemplate>();
        }
        
        return await _dbSet
            .Where(pt => pt.Category == categoryEnum)
            .OrderBy(pt => pt.Name)
            .ToListAsync();
    }
}