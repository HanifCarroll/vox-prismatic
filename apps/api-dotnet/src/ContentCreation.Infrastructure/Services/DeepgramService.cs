using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestSharp;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class DeepgramService : IDeepgramService
{
    private readonly ILogger<DeepgramService> _logger;
    private readonly IConfiguration _configuration;
    private readonly RestClient _client;
    private readonly string _apiKey;

    public DeepgramService(
        ILogger<DeepgramService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _apiKey = configuration["DEEPGRAM_API_KEY"] 
            ?? throw new InvalidOperationException("DEEPGRAM_API_KEY is not configured");
        
        _client = new RestClient("https://api.deepgram.com/v1/");
    }

    public async Task<string> TranscribeAudioAsync(string audioUrl)
    {
        _logger.LogInformation("Transcribing audio from URL: {Url}", audioUrl);
        
        var request = new RestRequest("listen", Method.Post);
        request.AddHeader("Authorization", $"Token {_apiKey}");
        request.AddHeader("Content-Type", "application/json");
        
        var body = new
        {
            url = audioUrl
        };
        
        request.AddJsonBody(body);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Deepgram transcription failed: {Error}", response.ErrorMessage);
            throw new Exception($"Transcription failed: {response.ErrorMessage}");
        }
        
        var result = JsonSerializer.Deserialize<DeepgramResponse>(response.Content!);
        var transcript = result?.Results?.Channels?.FirstOrDefault()?.Alternatives?.FirstOrDefault()?.Transcript;
        
        if (string.IsNullOrEmpty(transcript))
        {
            throw new Exception("No transcript received from Deepgram");
        }
        
        _logger.LogInformation("Successfully transcribed audio, length: {Length} characters", transcript.Length);
        return transcript;
    }

    public async Task<string> TranscribeFileAsync(byte[] audioData, string fileName)
    {
        _logger.LogInformation("Transcribing audio file: {FileName}, size: {Size} bytes", fileName, audioData.Length);
        
        var request = new RestRequest("listen", Method.Post);
        request.AddHeader("Authorization", $"Token {_apiKey}");
        request.AddHeader("Content-Type", "audio/wav"); // Adjust based on file type
        
        request.AddParameter("", audioData, ParameterType.RequestBody);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Deepgram transcription failed: {Error}", response.ErrorMessage);
            throw new Exception($"Transcription failed: {response.ErrorMessage}");
        }
        
        var result = JsonSerializer.Deserialize<DeepgramResponse>(response.Content!);
        var transcript = result?.Results?.Channels?.FirstOrDefault()?.Alternatives?.FirstOrDefault()?.Transcript;
        
        if (string.IsNullOrEmpty(transcript))
        {
            throw new Exception("No transcript received from Deepgram");
        }
        
        _logger.LogInformation("Successfully transcribed file, length: {Length} characters", transcript.Length);
        return transcript;
    }
}

public class DeepgramResponse
{
    public DeepgramResults? Results { get; set; }
}

public class DeepgramResults
{
    public List<DeepgramChannel>? Channels { get; set; }
}

public class DeepgramChannel
{
    public List<DeepgramAlternative>? Alternatives { get; set; }
}

public class DeepgramAlternative
{
    public string Transcript { get; set; } = string.Empty;
    public float Confidence { get; set; }
}