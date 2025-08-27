import { Module, Global } from '@nestjs/common';
import { CacheService } from '../services/cache.service';

/**
 * Global cache module that provides caching functionality
 * throughout the application
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}