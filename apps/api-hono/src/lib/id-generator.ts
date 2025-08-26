import { uuidv7 } from 'uuidv7';

/**
 * Centralized ID generation utility using UUID v7
 * 
 * UUID v7 provides time-ordered, globally unique identifiers with:
 * - Timestamp-based ordering for natural chronological sorting
 * - Cryptographically unique (no collision risk)
 * - RFC 9562 compliant standard format
 * - Database optimized for better index performance
 */
export class IdGenerator {
  /**
   * Generate a UUID v7 with optional prefix
   * 
   * @param prefix Optional prefix to prepend to the UUID
   * @returns Formatted ID string
   * 
   * Examples:
   * - IdGenerator.generate() → "018c7f24-3b68-7950-9f38-5f3b42c9d523"
   * - IdGenerator.generate('post') → "post_018c7f24-3b68-7950-9f38-5f3b42c9d523"
   */
  static generate(prefix?: string): string {
    const uuid = uuidv7();
    return prefix ? `${prefix}_${uuid}` : uuid;
  }
  
  /**
   * Generate multiple IDs with the same prefix
   * Useful for batch operations while maintaining time ordering
   * 
   * @param prefix Prefix for all generated IDs
   * @param count Number of IDs to generate
   * @returns Array of unique IDs
   */
  static generateBatch(prefix: string, count: number): string[] {
    return Array.from({ length: count }, () => this.generate(prefix));
  }
  
  /**
   * Extract timestamp from UUID v7
   * Useful for debugging or displaying creation time without separate timestamp field
   * 
   * @param uuid UUID v7 string (with or without prefix)
   * @returns Date object representing the embedded timestamp
   */
  static extractTimestamp(uuid: string): Date {
    // Extract UUID portion if it has a prefix
    const cleanUuid = uuid.includes('_') ? uuid.split('_')[1] : uuid;
    
    // UUID v7 has 48-bit timestamp in milliseconds in first 48 bits
    const timestampHex = cleanUuid.replace(/-/g, '').substring(0, 12);
    const timestamp = parseInt(timestampHex, 16);
    
    return new Date(timestamp);
  }
  
  /**
   * Validate if a string is a valid UUID v7 format
   * 
   * @param uuid String to validate
   * @returns True if valid UUID v7 format
   */
  static isValid(uuid: string): boolean {
    const cleanUuid = uuid.includes('_') ? uuid.split('_')[1] : uuid;
    const uuidv7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidv7Pattern.test(cleanUuid);
  }
}

/**
 * Convenience function for generating IDs
 * Shorthand for IdGenerator.generate()
 * 
 * @param prefix Optional prefix
 * @returns Generated ID
 */
export const generateId = (prefix?: string): string => IdGenerator.generate(prefix);