namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IDeepgramService
{
    Task<string> TranscribeAudioAsync(string audioUrl);
    Task<string> TranscribeFileAsync(byte[] audioData, string fileName);
}