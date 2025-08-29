import { Module } from '@nestjs/common';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { InsightRepository } from './insight.repository';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { JobStatusModule } from '../job-status/job-status.module';
import { StateModule } from '../state/state.module';

@Module({
  imports: [
    DatabaseModule, 
    SharedModule, 
    JobStatusModule,
    StateModule
  ],
  controllers: [InsightController],
  providers: [
    InsightService, 
    InsightRepository
  ],
  exports: [
    InsightService, 
    InsightRepository
  ],
})
export class InsightModule {}