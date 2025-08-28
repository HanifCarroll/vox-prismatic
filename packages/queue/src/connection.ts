import Redis from 'ioredis';
import { RedisConfig } from './types/config';
import { QueueLogger } from './utils/logger';

const logger = new QueueLogger('RedisConnection');

let redisConnection: Redis | null = null;

export function createRedisConnection(config: RedisConfig): Redis {
  if (redisConnection) {
    logger.debug('Returning existing Redis connection');
    return redisConnection;
  }

  logger.log('Creating new Redis connection', {
    host: config.host,
    port: config.port,
    db: config.db || 0
  });

  redisConnection = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db || 0,
    // BullMQ requires this to be null to avoid command blocking checks
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? null,
    enableReadyCheck: config.enableReadyCheck ?? true,
    retryStrategy: config.retryStrategy || ((times: number) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    }),
    lazyConnect: false,
  });

  redisConnection.on('connect', () => {
    logger.log('Redis connected successfully');
  });

  redisConnection.on('error', (error) => {
    logger.error('Redis connection error', error);
  });

  redisConnection.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisConnection.on('reconnecting', (delay: number) => {
    logger.log(`Redis reconnecting in ${delay}ms`);
  });

  return redisConnection;
}

export function getRedisConnection(): Redis | null {
  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    logger.log('Closing Redis connection');
    await redisConnection.quit();
    redisConnection = null;
  }
}

// Default configuration factory
export function getDefaultRedisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
}