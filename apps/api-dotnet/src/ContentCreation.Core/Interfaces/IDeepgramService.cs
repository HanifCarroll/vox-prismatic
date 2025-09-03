namespace ContentCreation.Core.Interfaces;

public interface IDeepgramService
{
    Task<string> TranscribeAudioAsync(string audioUrl);
    Task<string> TranscribeFileAsync(byte[] audioData, string fileName);
}