namespace ContentCreation.Api.Features.Transcripts.DTOs;

public class TranscriptDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Source { get; set; }
    public int? Duration { get; set; }
    public string? AudioFileUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTranscriptDto
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Source { get; set; }
    public int? Duration { get; set; }
    public string? AudioFileUrl { get; set; }
}

public class UpdateTranscriptDto
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? Source { get; set; }
    public int? Duration { get; set; }
    public string? AudioFileUrl { get; set; }
}