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
 * Validates that a parameter is a valid CUID or custom ID format
 * Accepts both CUID format (from Prisma) and legacy prefix_randomString format
 */
@Injectable()
export class CustomIdValidationPipe implements PipeTransform<string> {
  // CUID regex pattern - starts with 'c' followed by alphanumeric characters
  private readonly cuidRegex = /^c[a-z0-9]{24,}$/;
  // Legacy custom ID format: prefix_randomString
  private readonly customIdRegex = /^(insight|post|transcript|scheduled)_[a-zA-Z0-9]{6,}$/;
  
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('ID parameter is required');
    }
    
    // Check if it's a valid CUID (Prisma default)
    if (this.cuidRegex.test(value)) {
      return value;
    }
    
    // Check if it matches the legacy custom ID format
    if (this.customIdRegex.test(value)) {
      return value;
    }
    
    // If neither format matches, throw an error
    throw new BadRequestException(
      `Invalid ID format: ${value}. Expected a valid CUID or custom ID format.`
    );
  }
}