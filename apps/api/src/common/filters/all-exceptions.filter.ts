import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'string') {
        message = response;
        error = exception.name;
      } else {
        message = (response as any).message || exception.message;
        error = (response as any).error || exception.name;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      
      // Log unexpected errors
      this.logger.error(
        `Unhandled exception: ${(exception as Error)?.message || exception}`,
        (exception as Error)?.stack,
      );
    }

    const errorResponse = {
      success: false,
      error: message,
      message: error,
      // Include additional debug info in meta for development
      ...(process.env.NODE_ENV === 'development' && {
        meta: {
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        }
      })
    };

    // Log all errors except 404s and validation errors
    if (status >= 500 || (status >= 400 && status !== 404 && status !== 422)) {
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(errorResponse);
  }
}