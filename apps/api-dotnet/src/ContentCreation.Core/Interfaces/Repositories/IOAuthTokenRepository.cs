using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IOAuthTokenRepository : IRepository<OAuthToken>
{
    Task<OAuthToken?> GetByProviderAsync(string provider);
    Task<OAuthToken?> GetActiveTokenAsync(string provider);
    Task<IEnumerable<OAuthToken>> GetExpiringTokensAsync(DateTime threshold);
}