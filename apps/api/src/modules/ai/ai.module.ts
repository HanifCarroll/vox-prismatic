import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { PromptsModule } from '../prompts/prompts.module';
import { StateModule } from '../state/state.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SharedModule,
    PromptsModule,
    StateModule
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService]
})
export class AIModule {}