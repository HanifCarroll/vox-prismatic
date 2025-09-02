using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IPlatformAuthRepository : IRepository<PlatformAuth>
{
    Task<PlatformAuth?> GetByPlatformAsync(string platform);
    Task<IEnumerable<PlatformAuth>> GetActiveAuthsAsync();
}