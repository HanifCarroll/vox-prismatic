using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IPromptTemplateRepository : IRepository<PromptTemplate>
{
    Task<PromptTemplate?> GetByNameAsync(string name);
    Task<IEnumerable<PromptTemplate>> GetActiveTemplatesAsync();
    Task<IEnumerable<PromptTemplate>> GetByCategoryAsync(string category);
}