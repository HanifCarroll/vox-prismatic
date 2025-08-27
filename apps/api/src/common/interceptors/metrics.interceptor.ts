import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Metrics Interceptor
 * 
 * Logs only critical performance metrics and errors:
 * - Slow requests (>500ms in development, >1000ms in production)
 * - Failed requests with error details
 * - Optionally logs all requests in verbose mode for debugging
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('MetricsInterceptor');
  
  // Threshold for slow request warnings (in milliseconds)
  private readonly slowRequestThreshold = 
    process.env.NODE_ENV === 'production' ? 1000 : 500;
  
  // Skip logging for these paths
  private readonly skipPaths = [
    '/api/health',
    '/api/metrics',
    '/favicon.ico',
    '/docs',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();
    
    // Skip metrics for health checks and static resources
    if (this.skipPaths.some(path => url.startsWith(path))) {
      return next.handle();
    }
    
    // Log verbose request details only in debug mode
    if (process.env.LOG_LEVEL === 'verbose') {
      this.logger.verbose(
        `Incoming request: ${method} ${url} from ${ip} - ${userAgent}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          const { statusCode } = response;
          
          // Log slow requests
          if (duration > this.slowRequestThreshold) {
            this.logger.warn(
              `Slow request detected: ${method} ${url} - ${duration}ms [${statusCode}]`,
            );
            
            // In development, also log which operations might be slow
            if (process.env.NODE_ENV !== 'production' && duration > 1000) {
              this.logger.warn(
                `Very slow request (>1s): Consider optimizing this endpoint`,
              );
            }
          }
          
          // Log successful requests only in verbose mode
          if (process.env.LOG_LEVEL === 'verbose') {
            this.logger.verbose(
              `Request completed: ${method} ${url} - ${duration}ms [${statusCode}]`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - now;
          const statusCode = error.status || 500;
          
          // Always log errors with full context
          this.logger.error(
            `Request failed: ${method} ${url} - ${duration}ms [${statusCode}]`,
            {
              error: {
                message: error.message,
                name: error.name,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
              },
              request: {
                method,
                url,
                ip,
                userAgent,
                body: this.sanitizeBody(request.body),
                query: request.query,
              },
              duration,
            },
          );
        },
      }),
    );
  }

  /**
   * Sanitize request body to remove sensitive information before logging
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}