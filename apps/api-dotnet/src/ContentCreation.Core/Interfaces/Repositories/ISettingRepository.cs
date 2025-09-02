using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface ISettingRepository : IRepository<Setting>
{
    Task<Setting?> GetByKeyAsync(string key);
    Task<Dictionary<string, string>> GetAllSettingsAsync();
    Task UpdateSettingAsync(string key, string value);
}