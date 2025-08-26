import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LinkedInService } from './linkedin.service';

/**
 * LinkedIn integration module
 * Provides LinkedIn OAuth and API functionality
 */
@Module({
  imports: [ConfigModule],
  providers: [LinkedInService],
  exports: [LinkedInService],
})
export class LinkedInModule {}