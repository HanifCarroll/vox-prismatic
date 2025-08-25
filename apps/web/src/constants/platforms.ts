/**
 * Platform configuration constants
 * Only LinkedIn and X platforms supported
 */

import { Briefcase, Twitter } from 'lucide-react';
import type { Platform } from '@/types';

export const PLATFORM_CONFIG = {
  linkedin: {
    icon: Briefcase,
    color: 'bg-blue-600',
    label: 'LinkedIn',
    charLimit: 3000
  },
  x: {
    icon: Twitter,
    color: 'bg-black',
    label: 'X',
    charLimit: 280
  }
} as const;

// Helper function to get platform config with fallback
export function getPlatformConfig(platform: Platform) {
  return PLATFORM_CONFIG[platform] || {
    icon: Briefcase,
    color: 'bg-gray-600',
    label: 'Unknown Platform',
    charLimit: 2000
  };
}

// Platform options for dropdowns/filters
export const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' }
] as const;