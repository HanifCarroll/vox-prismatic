import { Module, forwardRef } from '@nestjs/common';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { InsightRepository } from './insight.repository';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { JobStatusModule } from '../job-status/job-status.module';
import { ContentProcessingModule } from '../content-processing/content-processing.module';

@Module({
  imports: [
    DatabaseModule, 
    SharedModule, 
    JobStatusModule,
    forwardRef(() => ContentProcessingModule)  // Need this for InsightService to work
  ],
  controllers: [InsightController],
  providers: [InsightService, InsightRepository],
  exports: [InsightService, InsightRepository],
})
export class InsightModule {}