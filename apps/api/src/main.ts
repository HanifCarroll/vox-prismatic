import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaService } from './modules/database';

async function bootstrap() {
  // Configure log levels based on environment
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevels: Array<'error' | 'warn' | 'log' | 'debug' | 'verbose'> = isDevelopment 
    ? ['error', 'warn', 'log', 'debug', 'verbose'] // All levels in development
    : ['error', 'warn', 'log']; // Only important logs in production
    
  // Override with LOG_LEVEL env variable if set
  const customLogLevel = process.env.LOG_LEVEL;
  if (customLogLevel === 'verbose' && !logLevels.includes('verbose')) {
    logLevels.push('verbose');
    if (!logLevels.includes('debug')) {
      logLevels.push('debug');
    }
  } else if (customLogLevel === 'debug' && !logLevels.includes('debug')) {
    logLevels.push('debug');
  }

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global interceptors for metrics and response transformation
  app.useGlobalInterceptors(new MetricsInterceptor(), new ResponseInterceptor());

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Content Creation API')
    .setDescription('Enhanced Content Creation API Server - NestJS Migration')
    .setVersion(process.env.API_VERSION || 'v2')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Global prefix
  app.setGlobalPrefix('api');

  // Prisma shutdown hook
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  console.log(`🚀 NestJS Content Creation API Server started`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Log level: ${customLogLevel || (isDevelopment ? 'debug' : 'standard')}`);
  console.log(`🛡️  Request validation: Enabled with class-validator`);
  console.log(`🎯 Error handling: Enhanced with exception filters`);
  console.log(`📈 Metrics: Monitoring slow requests (>${isDevelopment ? '500ms' : '1000ms'})`);
  console.log(`🔗 CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  console.log(`🌟 Server is running at http://${host}:${port}`);
  console.log(`❤️  Health check: http://${host}:${port}/api/health`);
  console.log(`📖 API docs: http://${host}:${port}/docs`);
}
bootstrap();
