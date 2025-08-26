import { Global, Module } from '@nestjs/common';
import { IdGeneratorService } from './services/id-generator.service';

/**
 * Global shared module providing common utilities across the application
 * Marked as @Global to make services available everywhere without importing
 */
@Global()
@Module({
  providers: [IdGeneratorService],
  exports: [IdGeneratorService],
})
export class SharedModule {}