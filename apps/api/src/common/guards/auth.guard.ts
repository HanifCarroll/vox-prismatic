import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { uuidv7 } from 'uuidv7';

/**
 * Authentication guard (placeholder for future implementation)
 * Currently allows all requests through but provides structure for future auth
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    
    // Add request ID for logging/tracing
    (request as any).requestId = this.generateRequestId();
    
    // TODO: Implement authentication logic
    // For now, we'll skip authentication to keep the migration simple
    // Future implementation could include:
    // - JWT token validation
    // - API key validation  
    // - Session validation
    
    // Example of what authentication might look like:
    // const token = this.extractTokenFromHeader(request);
    // if (!token) {
    //   throw new UnauthorizedException('Missing authentication token');
    // }
    // 
    // try {
    //   const payload = await this.jwtService.verifyAsync(token);
    //   request['user'] = payload;
    // } catch {
    //   throw new UnauthorizedException('Invalid authentication token');
    // }
    
    return true;
  }

  private generateRequestId(): string {
    return `req_${uuidv7()}`;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}