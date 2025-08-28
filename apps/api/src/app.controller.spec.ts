import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API information', () => {
      const result = appController.getApiInfo();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.version).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.endpoints).toBeDefined();
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBe('API is healthy');
      expect(result.timestamp).toBeDefined();
    });
  });
});
