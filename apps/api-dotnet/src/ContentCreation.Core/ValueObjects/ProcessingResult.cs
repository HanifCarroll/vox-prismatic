namespace ContentCreation.Core.ValueObjects;

public record ProcessingResult
{
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public int? ProcessingDurationMs { get; init; }
    public int? EstimatedTokens { get; init; }
    public decimal? EstimatedCost { get; init; }
    
    public static ProcessingResult Success(int? durationMs = null, int? tokens = null, decimal? cost = null)
        => new() 
        { 
            IsSuccess = true, 
            ProcessingDurationMs = durationMs,
            EstimatedTokens = tokens,
            EstimatedCost = cost
        };
    
    public static ProcessingResult Failure(string errorMessage)
        => new() { IsSuccess = false, ErrorMessage = errorMessage };
}