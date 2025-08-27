import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a parameter is a valid UUID v4
 */
@Injectable()
export class UUIDValidationPipe implements PipeTransform<string> {
  private readonly uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('ID parameter is required');
    }
    
    // Check if it's a valid UUID v4
    if (!this.uuidV4Regex.test(value)) {
      throw new BadRequestException(`Invalid ID format: ${value}. Expected a valid UUID v4.`);
    }
    
    return value.toLowerCase(); // Normalize to lowercase
  }
}

/**
 * Validates that a parameter is a valid custom ID format
 * Format: prefix_randomString (e.g., insight_abc123, post_xyz789)
 */
@Injectable()
export class CustomIdValidationPipe implements PipeTransform<string> {
  private readonly validPrefixes = ['insight', 'post', 'transcript', 'scheduled'];
  private readonly idRegex = /^(insight|post|transcript|scheduled)_[a-zA-Z0-9]{6,}$/;
  
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('ID parameter is required');
    }
    
    // Check if it matches the custom ID format
    if (!this.idRegex.test(value)) {
      throw new BadRequestException(
        `Invalid ID format: ${value}. Expected format: prefix_randomString (e.g., insight_abc123)`
      );
    }
    
    // Validate the prefix
    const prefix = value.split('_')[0];
    if (!this.validPrefixes.includes(prefix)) {
      throw new BadRequestException(
        `Invalid ID prefix: ${prefix}. Valid prefixes: ${this.validPrefixes.join(', ')}`
      );
    }
    
    return value;
  }
}