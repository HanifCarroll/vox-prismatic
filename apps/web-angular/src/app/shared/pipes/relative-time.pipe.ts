import { Pipe, PipeTransform } from '@angular/core';
import { DateUtils } from '../utils/date.utils';

/**
 * Pipe for displaying relative time in templates
 * Usage: {{ date | relativeTime }}
 */
@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: false // Make it impure so it updates automatically
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '';
    return DateUtils.formatRelativeTime(value);
  }
}

/**
 * Pipe for formatting dates
 * Usage: {{ date | formatDate:'short' }}
 */
@Pipe({
  name: 'formatDate',
  standalone: true
})
export class FormatDatePipe implements PipeTransform {
  transform(value: Date | string | null | undefined, format: 'short' | 'medium' | 'long' = 'medium'): string {
    if (!value) return '';
    return DateUtils.formatDate(value, format);
  }
}

/**
 * Pipe for formatting time
 * Usage: {{ date | formatTime:true }}
 */
@Pipe({
  name: 'formatTime',
  standalone: true
})
export class FormatTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined, includeSeconds = false): string {
    if (!value) return '';
    return DateUtils.formatTime(value, includeSeconds);
  }
}

/**
 * Pipe for formatting date and time together
 * Usage: {{ date | formatDateTime }}
 */
@Pipe({
  name: 'formatDateTime',
  standalone: true
})
export class FormatDateTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '';
    return DateUtils.formatDateTime(value);
  }
}

/**
 * Pipe for showing time until a future date
 * Usage: {{ futureDate | timeUntil }}
 */
@Pipe({
  name: 'timeUntil',
  standalone: true,
  pure: false
})
export class TimeUntilPipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '';
    return DateUtils.getTimeUntil(value);
  }
}

/**
 * Pipe for formatting duration
 * Usage: {{ milliseconds | duration }}
 */
@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return DateUtils.formatDuration(value);
  }
}

/**
 * Export all date pipes for easy import
 */
export const DATE_PIPES = [
  RelativeTimePipe,
  FormatDatePipe,
  FormatTimePipe,
  FormatDateTimePipe,
  TimeUntilPipe,
  DurationPipe
] as const;