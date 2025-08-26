import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublisherController } from './publisher.controller';
import { PublisherService } from './publisher.service';
import { DatabaseModule } from '../database/database.module';
import { LinkedInModule } from '../linkedin';
import { XModule } from '../x';

@Module({
  imports: [ConfigModule, DatabaseModule, LinkedInModule, XModule],
  controllers: [PublisherController],
  providers: [PublisherService],
  exports: [PublisherService],
})
export class PublisherModule {}