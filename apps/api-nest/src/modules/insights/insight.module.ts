import { Module } from '@nestjs/common';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { InsightRepository } from './insight.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InsightController],
  providers: [InsightService, InsightRepository],
  exports: [InsightService, InsightRepository],
})
export class InsightModule {}