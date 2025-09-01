using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestSharp;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class LinkedInService : ILinkedInService
{
    private readonly ILogger<LinkedInService> _logger;
    private readonly IConfiguration _configuration;
    private readonly RestClient _client;
    private readonly string _accessToken;

    public LinkedInService(
        ILogger<LinkedInService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _accessToken = configuration["LINKEDIN_ACCESS_TOKEN"] 
            ?? throw new InvalidOperationException("LINKEDIN_ACCESS_TOKEN is not configured");
        
        _client = new RestClient("https://api.linkedin.com/v2/");
    }

    public async Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null)
    {
        _logger.LogInformation("Publishing post to LinkedIn");
        
        var request = new RestRequest("ugcPosts", Method.Post);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        request.AddHeader("Content-Type", "application/json");
        request.AddHeader("X-Restli-Protocol-Version", "2.0.0");
        
        var authorUrn = await GetAuthorUrnAsync();
        
        var body = new
        {
            author = authorUrn,
            lifecycleState = "PUBLISHED",
            specificContent = new
            {
                shareCommentary = new
                {
                    text = content
                },
                shareMediaCategory = "NONE"
            },
            visibility = new
            {
                memberNetworkVisibility = "PUBLIC"
            }
        };
        
        request.AddJsonBody(body);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("LinkedIn post failed: {Error}", response.Content);
            throw new Exception($"LinkedIn post failed: {response.Content}");
        }
        
        var postId = response.Headers?.FirstOrDefault(h => h.Name == "X-RestLi-Id")?.Value?.ToString();
        
        _logger.LogInformation("Successfully published to LinkedIn with ID: {PostId}", postId);
        return postId ?? "unknown";
    }

    public async Task<bool> ValidateCredentialsAsync()
    {
        try
        {
            var request = new RestRequest("me", Method.Get);
            request.AddHeader("Authorization", $"Bearer {_accessToken}");
            
            var response = await _client.ExecuteAsync(request);
            return response.IsSuccessful;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate LinkedIn credentials");
            return false;
        }
    }

    private async Task<string> GetAuthorUrnAsync()
    {
        var request = new RestRequest("me", Method.Get);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception("Failed to get LinkedIn profile");
        }
        
        var profile = JsonSerializer.Deserialize<LinkedInProfile>(response.Content!);
        return $"urn:li:person:{profile?.Id}";
    }
}

public class LinkedInProfile
{
    public string Id { get; set; } = string.Empty;
}