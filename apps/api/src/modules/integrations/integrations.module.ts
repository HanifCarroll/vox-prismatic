import { Global, Module } from '@nestjs/common';

/**
 * Global module that provides shared types and utilities for social media integrations
 * This module exports types and interfaces used across LinkedIn, X, and other platform modules
 */
@Global()
@Module({
  // No providers or controllers - this module just exports types
  // The types are imported directly where needed
})
export class IntegrationsModule {}