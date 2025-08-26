import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { XService } from './x.service';

/**
 * X (Twitter) integration module
 * Provides X OAuth 2.0 and API v2 functionality
 */
@Module({
  imports: [ConfigModule],
  providers: [XService],
  exports: [XService],
})
export class XModule {}