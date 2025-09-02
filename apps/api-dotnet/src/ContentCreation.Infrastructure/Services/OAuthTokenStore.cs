using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace ContentCreation.Infrastructure.Services;

public class OAuthTokenStore : IOAuthTokenStore
{
    private readonly ApplicationDbContext _db;

    private static string Encrypt(string plaintext)
    {
        var key = GetKey();
        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();
        using var encryptor = aes.CreateEncryptor();
        var bytes = Encoding.UTF8.GetBytes(plaintext);
        var cipher = encryptor.TransformFinalBlock(bytes, 0, bytes.Length);
        var result = new byte[aes.IV.Length + cipher.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipher, 0, result, aes.IV.Length, cipher.Length);
        return Convert.ToBase64String(result);
    }

    private static string Decrypt(string ciphertext)
    {
        var key = GetKey();
        var buffer = Convert.FromBase64String(ciphertext);
        using var aes = Aes.Create();
        aes.Key = key;
        var iv = new byte[aes.IV.Length];
        var cipher = new byte[buffer.Length - iv.Length];
        Buffer.BlockCopy(buffer, 0, iv, 0, iv.Length);
        Buffer.BlockCopy(buffer, iv.Length, cipher, 0, cipher.Length);
        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor();
        var plain = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
        return Encoding.UTF8.GetString(plain);
    }

    private static byte[] GetKey()
    {
        // Simple key derivation from environment variable; replace with Data Protection in prod
        var secret = Environment.GetEnvironmentVariable("OAUTH_TOKEN_ENCRYPTION_KEY") ?? "change-me-32-bytes-key!!!!!!!!";
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        if (keyBytes.Length < 32)
        {
            Array.Resize(ref keyBytes, 32);
        }
        else if (keyBytes.Length > 32)
        {
            Array.Resize(ref keyBytes, 32);
        }
        return keyBytes;
    }

    public OAuthTokenStore(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task StoreAsync(string userId, string platform, string accessToken, string? refreshToken, DateTime? expiresAt)
    {
        var existing = await _db.OAuthTokens.FirstOrDefaultAsync(t => t.UserId == Guid.Parse(userId) && t.Platform == platform);
        if (existing == null)
        {
            existing = new OAuthToken
            {
                UserId = Guid.Parse(userId),
                Platform = platform,
            };
            _db.OAuthTokens.Add(existing);
        }

        existing.AccessTokenEncrypted = Encrypt(accessToken);
        existing.RefreshTokenEncrypted = string.IsNullOrEmpty(refreshToken) ? null : Encrypt(refreshToken);
        existing.ExpiresAt = expiresAt;
        existing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task<(string AccessToken, string? RefreshToken, DateTime? ExpiresAt)?> GetAsync(string userId, string platform)
    {
        var token = await _db.OAuthTokens.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == Guid.Parse(userId) && t.Platform == platform);
        if (token == null) return null;
        var access = Decrypt(token.AccessTokenEncrypted);
        var refresh = string.IsNullOrEmpty(token.RefreshTokenEncrypted) ? null : Decrypt(token.RefreshTokenEncrypted);
        return (access, refresh, token.ExpiresAt);
    }

    public async Task RemoveAsync(string userId, string platform)
    {
        var token = await _db.OAuthTokens.FirstOrDefaultAsync(t => t.UserId == Guid.Parse(userId) && t.Platform == platform);
        if (token != null)
        {
            _db.OAuthTokens.Remove(token);
            await _db.SaveChangesAsync();
        }
    }
}


