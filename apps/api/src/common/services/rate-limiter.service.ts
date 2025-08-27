import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
  retryAfterMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  config: RateLimitConfig;
}

/**
 * Token bucket-based rate limiter with exponential backoff
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, TokenBucket>();
  
  // Default platform-specific rate limits
  private readonly defaultConfigs: Record<string, RateLimitConfig> = {
    linkedin: {
      requestsPerMinute: 30,
      burstSize: 5,
      retryAfterMs: 2000,
      maxRetries: 3,
      backoffMultiplier: 2,
    },
    x: {
      requestsPerMinute: 300, // Twitter has higher limits
      burstSize: 10,
      retryAfterMs: 1000,
      maxRetries: 3,
      backoffMultiplier: 1.5,
    },
    default: {
      requestsPerMinute: 60,
      burstSize: 5,
      retryAfterMs: 1500,
      maxRetries: 3,
      backoffMultiplier: 2,
    },
  };

  constructor(private readonly configService: ConfigService) {
    // Load custom rate limits from config if available
    const customLimits = this.configService.get<Record<string, RateLimitConfig>>('rateLimits');
    if (customLimits) {
      Object.assign(this.defaultConfigs, customLimits);
    }
  }

  /**
   * Get or create a token bucket for a platform
   */
  private getBucket(platform: string): TokenBucket {
    if (!this.buckets.has(platform)) {
      const config = this.defaultConfigs[platform] || this.defaultConfigs.default;
      this.buckets.set(platform, {
        tokens: config.burstSize,
        lastRefill: Date.now(),
        config,
      });
    }
    return this.buckets.get(platform)!;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;
    
    const tokensToAdd = Math.floor(elapsedMinutes * bucket.config.requestsPerMinute);
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.config.burstSize, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
      this.logger.debug(`Refilled ${tokensToAdd} tokens for bucket`);
    }
  }

  /**
   * Check if a request can proceed
   */
  async canProceed(platform: string): Promise<boolean> {
    const bucket = this.getBucket(platform);
    this.refillTokens(bucket);
    
    if (bucket.tokens > 0) {
      bucket.tokens--;
      this.logger.debug(`Platform ${platform}: ${bucket.tokens} tokens remaining`);
      return true;
    }
    
    return false;
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(platform: string, attemptNumber: number = 0): Promise<void> {
    const bucket = this.getBucket(platform);
    
    if (await this.canProceed(platform)) {
      return; // Token available, no need to wait
    }
    
    // Calculate backoff delay
    const baseDelay = bucket.config.retryAfterMs;
    const backoffDelay = baseDelay * Math.pow(bucket.config.backoffMultiplier, attemptNumber);
    const maxDelay = baseDelay * 10; // Cap at 10x base delay
    const delay = Math.min(backoffDelay, maxDelay);
    
    this.logger.warn(
      `Rate limit reached for ${platform}. Waiting ${delay}ms (attempt ${attemptNumber + 1})`
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // After waiting, refill tokens and try again
    this.refillTokens(bucket);
  }

  /**
   * Calculate optimal delay between requests
   */
  getOptimalDelay(platform: string): number {
    const config = this.defaultConfigs[platform] || this.defaultConfigs.default;
    // Calculate delay to maintain steady rate
    return Math.ceil(60000 / config.requestsPerMinute);
  }

  /**
   * Reset rate limit for a platform (useful for testing)
   */
  reset(platform: string): void {
    this.buckets.delete(platform);
    this.logger.debug(`Reset rate limit for platform: ${platform}`);
  }

  /**
   * Get current rate limit status
   */
  getStatus(platform: string): { tokens: number; config: RateLimitConfig } {
    const bucket = this.getBucket(platform);
    this.refillTokens(bucket);
    return {
      tokens: bucket.tokens,
      config: bucket.config,
    };
  }

  /**
   * Handle rate limit error with exponential backoff
   */
  async handleRateLimitError(
    platform: string,
    attemptNumber: number,
    error: any
  ): Promise<boolean> {
    const bucket = this.getBucket(platform);
    
    if (attemptNumber >= bucket.config.maxRetries) {
      this.logger.error(
        `Max retries (${bucket.config.maxRetries}) reached for ${platform}`
      );
      return false; // Don't retry
    }
    
    // Check if error is rate limit related
    const isRateLimitError = 
      error?.status === 429 ||
      error?.message?.toLowerCase().includes('rate limit') ||
      error?.message?.toLowerCase().includes('too many');
    
    if (isRateLimitError) {
      await this.waitForRateLimit(platform, attemptNumber);
      return true; // Retry after waiting
    }
    
    return false; // Don't retry for non-rate-limit errors
  }
}