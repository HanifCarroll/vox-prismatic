using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class OAuthTokenRepository : Repository<OAuthToken>, IOAuthTokenRepository
{
    public OAuthTokenRepository(ApplicationDbContext context) : base(context) { }

    public async Task<OAuthToken?> GetByProviderAsync(string provider)
    {
        return await _dbSet
            .FirstOrDefaultAsync(t => t.Platform == provider);
    }

    public async Task<OAuthToken?> GetActiveTokenAsync(string provider)
    {
        return await _dbSet
            .Where(t => t.Platform == provider && t.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<OAuthToken>> GetExpiringTokensAsync(DateTime threshold)
    {
        return await _dbSet
            .Where(t => t.ExpiresAt <= threshold)
            .ToListAsync();
    }
}