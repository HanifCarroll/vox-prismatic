using System;
using System.Collections.Generic;

namespace ContentCreation.Core.DTOs.Queue;

public class QueueStatsDto
{
    public int PendingCount { get; set; }
    public int ProcessingCount { get; set; }
    public int CompletedCount { get; set; }
    public int FailedCount { get; set; }
    public int TotalCount { get; set; }
    public string? QueueName { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class JobDetailsDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Queue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? DurationMs { get; set; }
    public int RetryCount { get; set; }
    public string? Error { get; set; }
    public string? StackTrace { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public List<string>? Arguments { get; set; }
    public string? Result { get; set; }
}