import { Module, Global } from '@nestjs/common';
import { QueueManager } from '@content-creation/queue';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [
    {
      provide: 'QUEUE_MANAGER',
      useFactory: async () => {
        const manager = new QueueManager({
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
        });
        
        // Connect and verify Redis connection
        await manager.connect();
        
        return manager;
      },
    },
    QueueService,
  ],
  exports: [QueueService, 'QUEUE_MANAGER'],
})
export class QueueModule {}