using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;

namespace ContentCreation.Infrastructure.Configuration;

public interface IApiKeyValidator
{
    bool ValidateAllKeys();
    bool ValidateKey(string keyName);
    List<string> GetMissingKeys();
}

public class ApiKeyValidator : IApiKeyValidator
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ApiKeyValidator> _logger;
    private readonly IHostEnvironment _environment;

    private readonly Dictionary<string, ApiKeyConfig> _requiredKeys = new()
    {
        ["GOOGLE_AI_API_KEY"] = new ApiKeyConfig 
        { 
            IsRequired = true, 
            Description = "Google Generative AI (Gemini) API key",
            ValidationPattern = @"^AIza[0-9A-Za-z\-_]{35}$"
        },
        ["DEEPGRAM_API_KEY"] = new ApiKeyConfig 
        { 
            IsRequired = true, 
            Description = "Deepgram transcription API key",
            ValidationPattern = @"^[a-f0-9]{40,}$"
        },
        ["LINKEDIN_CLIENT_ID"] = new ApiKeyConfig 
        { 
            IsRequired = false, 
            Description = "LinkedIn OAuth Client ID" 
        },
        ["LINKEDIN_CLIENT_SECRET"] = new ApiKeyConfig 
        { 
            IsRequired = false, 
            Description = "LinkedIn OAuth Client Secret" 
        },
        ["X_CLIENT_ID"] = new ApiKeyConfig 
        { 
            IsRequired = false, 
            Description = "X (Twitter) OAuth Client ID" 
        },
        ["X_CLIENT_SECRET"] = new ApiKeyConfig 
        { 
            IsRequired = false, 
            Description = "X (Twitter) OAuth Client Secret" 
        }
    };

    public ApiKeyValidator(
        IConfiguration configuration, 
        ILogger<ApiKeyValidator> logger,
        IHostEnvironment environment)
    {
        _configuration = configuration;
        _logger = logger;
        _environment = environment;
    }

    public bool ValidateAllKeys()
    {
        var missingKeys = GetMissingKeys();
        var invalidKeys = new List<string>();
        
        foreach (var keyName in _requiredKeys.Keys)
        {
            var config = _requiredKeys[keyName];
            var value = _configuration[keyName];
            
            if (!string.IsNullOrEmpty(value) && !string.IsNullOrEmpty(config.ValidationPattern))
            {
                if (!System.Text.RegularExpressions.Regex.IsMatch(value, config.ValidationPattern))
                {
                    invalidKeys.Add(keyName);
                    _logger.LogWarning("API key {KeyName} appears to be invalid format", keyName);
                }
            }
        }
        
        if (missingKeys.Any())
        {
            _logger.LogError("Missing required API keys: {Keys}", string.Join(", ", missingKeys));
            
            if (!_environment.IsDevelopment())
            {
                throw new InvalidOperationException(
                    $"Missing required API keys: {string.Join(", ", missingKeys)}. " +
                    "Please configure these in environment variables or appsettings.json");
            }
            else
            {
                _logger.LogWarning("Running in development mode with missing API keys. Some features may not work.");
            }
        }
        
        if (invalidKeys.Any())
        {
            _logger.LogWarning("Invalid API key formats detected: {Keys}", string.Join(", ", invalidKeys));
        }
        
        return !missingKeys.Any() && !invalidKeys.Any();
    }

    public bool ValidateKey(string keyName)
    {
        if (!_requiredKeys.ContainsKey(keyName))
        {
            _logger.LogWarning("Unknown API key: {KeyName}", keyName);
            return true; // Don't fail for unknown keys
        }
        
        var config = _requiredKeys[keyName];
        var value = _configuration[keyName];
        
        if (string.IsNullOrEmpty(value))
        {
            if (config.IsRequired)
            {
                _logger.LogError("Missing required API key: {KeyName} - {Description}", 
                    keyName, config.Description);
                return false;
            }
            else
            {
                _logger.LogInformation("Optional API key not configured: {KeyName}", keyName);
                return true;
            }
        }
        
        if (!string.IsNullOrEmpty(config.ValidationPattern))
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(value, config.ValidationPattern))
            {
                _logger.LogWarning("API key {KeyName} appears to be invalid format", keyName);
                return false;
            }
        }
        
        _logger.LogInformation("API key {KeyName} validated successfully", keyName);
        return true;
    }

    public List<string> GetMissingKeys()
    {
        var missingKeys = new List<string>();
        
        foreach (var kvp in _requiredKeys)
        {
            if (kvp.Value.IsRequired)
            {
                var value = _configuration[kvp.Key];
                if (string.IsNullOrEmpty(value))
                {
                    missingKeys.Add(kvp.Key);
                }
            }
        }
        
        return missingKeys;
    }
}

public class ApiKeyConfig
{
    public bool IsRequired { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ValidationPattern { get; set; }
}

// Extension method to add validation to the startup
public static class ApiKeyValidationExtensions
{
    public static IServiceCollection AddApiKeyValidation(this IServiceCollection services)
    {
        services.AddSingleton<IApiKeyValidator, ApiKeyValidator>();
        return services;
    }
    
    public static IApplicationBuilder ValidateApiKeys(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var validator = scope.ServiceProvider.GetRequiredService<IApiKeyValidator>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApiKeyValidator>>();
        
        try
        {
            if (validator.ValidateAllKeys())
            {
                logger.LogInformation("All required API keys validated successfully");
            }
            else
            {
                logger.LogWarning("Some API keys are missing or invalid. Check logs for details.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "API key validation failed");
            throw;
        }
        
        return app;
    }
}