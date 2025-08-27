import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps successful responses in a consistent envelope:
 * { success: true, data, meta? }
 * If the handler already returns an object with a success flag, it is passed through.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((payload) => {
        // Pass through if already conforms to our ApiResponse shape
        if (payload && typeof payload === 'object' && 'success' in payload) {
          return payload;
        }

        // If payload contains data/meta already (as in list endpoints), wrap accordingly
        if (payload && typeof payload === 'object' && 'data' in payload && ('meta' in payload || Array.isArray(payload.data))) {
          return { success: true, ...payload };
        }

        return { success: true, data: payload };
      }),
    );
  }
}


