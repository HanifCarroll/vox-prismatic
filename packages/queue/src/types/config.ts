export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
  enableReadyCheck?: boolean;
  retryStrategy?: (times: number) => number | null;
}

export interface QueueConfig {
  redis: RedisConfig;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: {
      age?: number; // Max age in seconds
      count?: number; // Max number of jobs to keep
    };
    removeOnFail?: {
      age?: number; // Max age in seconds
      count?: number; // Max number of jobs to keep
    };
  };
}