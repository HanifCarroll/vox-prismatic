using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace ContentCreation.Api.Features.Auth.Services;

public class PasswordService : IPasswordService
{
    private const int SaltSize = 128 / 8; // 16 bytes
    private const int KeySize = 256 / 8; // 32 bytes
    private const int Iterations = 10000;
    private const char Delimiter = ';';
    
    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password cannot be empty", nameof(password));

        // Generate a random salt
        var salt = new byte[SaltSize];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(salt);
        }

        // Hash the password
        var hash = KeyDerivation.Pbkdf2(
            password: password,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: Iterations,
            numBytesRequested: KeySize);

        // Combine salt and hash for storage
        var result = new byte[SaltSize + KeySize];
        Buffer.BlockCopy(salt, 0, result, 0, SaltSize);
        Buffer.BlockCopy(hash, 0, result, SaltSize, KeySize);

        return Convert.ToBase64String(result);
    }

    public bool VerifyPassword(string hashedPassword, string providedPassword)
    {
        if (string.IsNullOrWhiteSpace(hashedPassword))
            return false;
        
        if (string.IsNullOrWhiteSpace(providedPassword))
            return false;

        try
        {
            // Extract the salt and hash from the stored password
            var hashBytes = Convert.FromBase64String(hashedPassword);
            
            if (hashBytes.Length != SaltSize + KeySize)
                return false;

            var salt = new byte[SaltSize];
            Buffer.BlockCopy(hashBytes, 0, salt, 0, SaltSize);

            var storedHash = new byte[KeySize];
            Buffer.BlockCopy(hashBytes, SaltSize, storedHash, 0, KeySize);

            // Hash the provided password with the same salt
            var providedHash = KeyDerivation.Pbkdf2(
                password: providedPassword,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: Iterations,
                numBytesRequested: KeySize);

            // Compare the hashes
            return CryptographicEquals(storedHash, providedHash);
        }
        catch
        {
            return false;
        }
    }

    private static bool CryptographicEquals(byte[] a, byte[] b)
    {
        if (a == null || b == null || a.Length != b.Length)
            return false;

        var result = 0;
        for (var i = 0; i < a.Length; i++)
        {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }

    public string GenerateSecureToken()
    {
        // Generate a cryptographically secure random token
        var tokenBytes = new byte[32]; // 256 bits
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(tokenBytes);
        }
        
        // Convert to URL-safe base64
        return Convert.ToBase64String(tokenBytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .Replace("=", "");
    }

    public string HashToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("Token cannot be empty", nameof(token));

        // Use SHA256 to hash the token
        using (var sha256 = SHA256.Create())
        {
            var tokenBytes = System.Text.Encoding.UTF8.GetBytes(token);
            var hashBytes = sha256.ComputeHash(tokenBytes);
            return Convert.ToBase64String(hashBytes);
        }
    }
}