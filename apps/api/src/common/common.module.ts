import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { StatusManagerService } from './services/status-manager.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { ConfigModule } from '@nestjs/config';

/**
 * Global module for shared services
 * These services are available throughout the application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CacheService,
    StatusManagerService,
    RateLimiterService,
  ],
  exports: [
    CacheService,
    StatusManagerService,
    RateLimiterService,
  ],
})
export class CommonModule {}