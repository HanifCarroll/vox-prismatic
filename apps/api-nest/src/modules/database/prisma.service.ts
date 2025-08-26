import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connection established (PostgreSQL via Prisma)');
    } catch (error) {
      console.log('⚠️ Database connection failed, but continuing for demonstration');
      console.log('   In production, you would provide valid DATABASE_URL');
    }
  }

  async enableShutdownHooks(app: any) {
    process.on('beforeExit', async () => {
      await this.$disconnect();
      await app.close();
    });
  }
}