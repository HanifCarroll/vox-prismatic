using System.Diagnostics;
using System.Text;
using Microsoft.IO;

namespace ContentCreation.Api.Infrastructure.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly RecyclableMemoryStreamManager _recyclableMemoryStreamManager;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _recyclableMemoryStreamManager = new RecyclableMemoryStreamManager();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_logger.IsEnabled(LogLevel.Information))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString("N")[..8];
        
        // Log request
        await LogRequest(context, requestId);

        // Capture response
        var originalBodyStream = context.Response.Body;
        using var responseBody = _recyclableMemoryStreamManager.GetStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            
            // Log response
            await LogResponse(context, requestId, stopwatch.ElapsedMilliseconds);
            
            // Copy the response body back to the original stream
            await responseBody.CopyToAsync(originalBodyStream);
        }
    }

    private async Task LogRequest(HttpContext context, string requestId)
    {
        context.Request.EnableBuffering();

        var request = context.Request;
        var requestLog = new StringBuilder();
        
        requestLog.AppendLine($"[{requestId}] HTTP Request Information:");
        requestLog.AppendLine($"Method: {request.Method}");
        requestLog.AppendLine($"Path: {request.Path}");
        requestLog.AppendLine($"QueryString: {request.QueryString}");
        requestLog.AppendLine($"Headers: {FormatHeaders(request.Headers)}");
        
        if (request.ContentLength > 0 && request.ContentLength < 100_000) // Don't log large bodies
        {
            request.Body.Position = 0;
            using var reader = new StreamReader(
                request.Body,
                encoding: Encoding.UTF8,
                detectEncodingFromByteOrderMarks: false,
                leaveOpen: true);
            
            var body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
            
            if (!string.IsNullOrWhiteSpace(body))
            {
                // Sanitize sensitive data
                body = SanitizeSensitiveData(body);
                requestLog.AppendLine($"Body: {body}");
            }
        }
        
        _logger.LogInformation(requestLog.ToString());
    }

    private async Task LogResponse(HttpContext context, string requestId, long elapsedMs)
    {
        var response = context.Response;
        var responseLog = new StringBuilder();
        
        responseLog.AppendLine($"[{requestId}] HTTP Response Information:");
        responseLog.AppendLine($"StatusCode: {response.StatusCode}");
        responseLog.AppendLine($"ElapsedTime: {elapsedMs}ms");
        responseLog.AppendLine($"Headers: {FormatHeaders(response.Headers)}");
        
        if (response.Body.Length > 0 && response.Body.Length < 100_000) // Don't log large bodies
        {
            response.Body.Seek(0, SeekOrigin.Begin);
            var text = await new StreamReader(response.Body).ReadToEndAsync();
            response.Body.Seek(0, SeekOrigin.Begin);
            
            if (!string.IsNullOrWhiteSpace(text))
            {
                // Sanitize sensitive data
                text = SanitizeSensitiveData(text);
                responseLog.AppendLine($"Body: {text}");
            }
        }
        
        if (response.StatusCode >= 400)
        {
            _logger.LogWarning(responseLog.ToString());
        }
        else
        {
            _logger.LogInformation(responseLog.ToString());
        }
    }

    private static string FormatHeaders(IHeaderDictionary headers)
    {
        var formattedHeaders = new StringBuilder();
        foreach (var (key, value) in headers)
        {
            // Skip sensitive headers
            if (key.Equals("Authorization", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("Cookie", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase))
            {
                formattedHeaders.Append($"{key}: [REDACTED], ");
            }
            else
            {
                formattedHeaders.Append($"{key}: {value}, ");
            }
        }
        
        return formattedHeaders.ToString().TrimEnd(',', ' ');
    }

    private static string SanitizeSensitiveData(string text)
    {
        // Basic sanitization - in production, use more sophisticated methods
        var patterns = new[]
        {
            (@"""password""\s*:\s*""[^""]+""", @"""password"":""[REDACTED]"""),
            (@"""token""\s*:\s*""[^""]+""", @"""token"":""[REDACTED]"""),
            (@"""apiKey""\s*:\s*""[^""]+""", @"""apiKey"":""[REDACTED]"""),
            (@"""secret""\s*:\s*""[^""]+""", @"""secret"":""[REDACTED]"""),
            (@"""accessToken""\s*:\s*""[^""]+""", @"""accessToken"":""[REDACTED]"""),
            (@"""refreshToken""\s*:\s*""[^""]+""", @"""refreshToken"":""[REDACTED]""")
        };

        var sanitized = text;
        foreach (var (pattern, replacement) in patterns)
        {
            sanitized = System.Text.RegularExpressions.Regex.Replace(
                sanitized, 
                pattern, 
                replacement, 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        }

        return sanitized;
    }
}

public static class RequestLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestLoggingMiddleware>();
    }
}