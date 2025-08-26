import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SharedModule
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService]
})
export class AIModule {}