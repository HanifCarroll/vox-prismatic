import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache service with TTL support
 * Provides automatic expiration and cache invalidation
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run cleanup every minute to remove expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL (in milliseconds)
   * Default TTL is 5 minutes
   */
  async set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    this.logger.debug(`Cached key: ${key} with TTL: ${ttl}ms`);
  }

  /**
   * Get or set a value using a factory function
   * If the key exists and hasn't expired, return it
   * Otherwise, call the factory, cache the result, and return it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache or expired, fetch fresh data
    this.logger.debug(`Cache miss for key: ${key}, fetching fresh data`);
    const data = await factory();
    
    // Cache the result
    await this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Increment a numeric value in cache
   * If the key doesn't exist, it will be created with the initial value
   */
  async increment(key: string, amount: number = 1, ttl: number = 5 * 60 * 1000): Promise<number> {
    const existing = await this.get<number>(key);
    const newValue = (existing || 0) + amount;
    
    await this.set(key, newValue, ttl);
    this.logger.debug(`Incremented cache key ${key} by ${amount}, new value: ${newValue}`);
    
    return newValue;
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.logger.debug(`Deleted cache key: ${key}`);
  }

  /**
   * Delete all keys matching a pattern
   * Useful for invalidating related cache entries
   */
  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.logger.debug(`Deleted ${deletedCount} cache keys matching pattern: ${pattern}`);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let expiredCount = 0;
    let validCount = 0;
    const now = Date.now();

    for (const [, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Clean up expired entries
   * This runs automatically every minute
   */
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  /**
   * Estimate memory usage of cache (rough approximation)
   */
  private estimateMemoryUsage(): string {
    // This is a rough estimate, actual usage may vary
    const jsonString = JSON.stringify(Array.from(this.cache.entries()));
    const bytes = new TextEncoder().encode(jsonString).length;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}