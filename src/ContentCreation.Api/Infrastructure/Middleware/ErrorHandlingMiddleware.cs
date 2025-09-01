using System.Net;
using System.Text.Json;
using FluentValidation;

namespace ContentCreation.Api.Infrastructure.Middleware;

public class ErrorHandlingMiddleware
{
	private readonly RequestDelegate _next;
	private readonly ILogger<ErrorHandlingMiddleware> _logger;
	private readonly IWebHostEnvironment _environment;

	public ErrorHandlingMiddleware(
		RequestDelegate next,
		ILogger<ErrorHandlingMiddleware> logger,
		IWebHostEnvironment environment)
	{
		_next = next;
		_logger = logger;
		_environment = environment;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		try
		{
			await _next(context);
		}
		catch (Exception ex)
		{
			await HandleExceptionAsync(context, ex);
		}
	}

	private async Task HandleExceptionAsync(HttpContext context, Exception exception)
	{
		_logger.LogError(exception, "An unhandled exception occurred");

		var response = context.Response;
		response.ContentType = "application/json";

		var errorResponse = new ErrorResponse
		{
			TraceId = context.TraceIdentifier,
			Timestamp = DateTime.UtcNow
		};

		switch (exception)
		{
			case ValidationException validationException:
				response.StatusCode = (int)HttpStatusCode.BadRequest;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = "Validation failed";
				errorResponse.Errors = validationException.Errors
					.GroupBy(e => e.PropertyName)
					.ToDictionary(
						g => g.Key,
						g => g.Select(e => e.ErrorMessage).ToArray()
					);
				break;

			case KeyNotFoundException:
				response.StatusCode = (int)HttpStatusCode.NotFound;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = exception.Message;
				break;

			case UnauthorizedAccessException:
				response.StatusCode = (int)HttpStatusCode.Unauthorized;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = "Unauthorized access";
				break;

			case InvalidOperationException:
				response.StatusCode = (int)HttpStatusCode.BadRequest;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = exception.Message;
				break;

			case TimeoutException:
				response.StatusCode = (int)HttpStatusCode.RequestTimeout;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = "Request timeout";
				break;

			case NotImplementedException:
				response.StatusCode = (int)HttpStatusCode.NotImplemented;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = "Feature not implemented";
				break;

			case ArgumentNullException:
			case ArgumentException:
				response.StatusCode = (int)HttpStatusCode.BadRequest;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = exception.Message;
				break;

			default:
				response.StatusCode = (int)HttpStatusCode.InternalServerError;
				errorResponse.StatusCode = response.StatusCode;
				errorResponse.Message = "An error occurred while processing your request";
				
				if (_environment.IsDevelopment())
				{
					errorResponse.DeveloperMessage = exception.ToString();
				}
				break;
		}

		var jsonOptions = new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
			WriteIndented = _environment.IsDevelopment()
		};

		var json = JsonSerializer.Serialize(errorResponse, jsonOptions);
		await response.WriteAsync(json);
	}
}

public class ErrorResponse
{
	public int StatusCode { get; set; }
	public string Message { get; set; } = string.Empty;
	public string? DeveloperMessage { get; set; }
	public Dictionary<string, string[]>? Errors { get; set; }
	public string TraceId { get; set; } = string.Empty;
	public DateTime Timestamp { get; set; }
}

public static class ErrorHandlingMiddlewareExtensions
{
	public static IApplicationBuilder UseErrorHandling(this IApplicationBuilder builder)
	{
		return builder.UseMiddleware<ErrorHandlingMiddleware>();
	}
}

