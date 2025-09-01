using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestSharp;
using RestSharp.Authenticators.OAuth;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class TwitterService : ITwitterService
{
    private readonly ILogger<TwitterService> _logger;
    private readonly IConfiguration _configuration;
    private readonly RestClient _client;
    private readonly string _bearerToken;

    public TwitterService(
        ILogger<TwitterService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _bearerToken = configuration["X_BEARER_TOKEN"] 
            ?? throw new InvalidOperationException("X_BEARER_TOKEN is not configured");
        
        _client = new RestClient("https://api.twitter.com/2/");
    }

    public async Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null)
    {
        _logger.LogInformation("Publishing post to Twitter/X");
        
        var request = new RestRequest("tweets", Method.Post);
        request.AddHeader("Authorization", $"Bearer {_bearerToken}");
        request.AddHeader("Content-Type", "application/json");
        
        var body = new
        {
            text = content
        };
        
        request.AddJsonBody(body);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Twitter post failed: {Error}", response.Content);
            throw new Exception($"Twitter post failed: {response.Content}");
        }
        
        var result = JsonSerializer.Deserialize<TwitterPostResponse>(response.Content!);
        var tweetId = result?.Data?.Id;
        
        _logger.LogInformation("Successfully published to Twitter with ID: {TweetId}", tweetId);
        return tweetId ?? "unknown";
    }

    public async Task<bool> ValidateCredentialsAsync()
    {
        try
        {
            var request = new RestRequest("users/me", Method.Get);
            request.AddHeader("Authorization", $"Bearer {_bearerToken}");
            
            var response = await _client.ExecuteAsync(request);
            return response.IsSuccessful;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate Twitter credentials");
            return false;
        }
    }
}

public class TwitterPostResponse
{
    public TwitterPostData? Data { get; set; }
}

public class TwitterPostData
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}