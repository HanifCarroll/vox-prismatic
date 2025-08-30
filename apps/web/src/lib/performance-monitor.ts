/**
 * Performance monitoring utilities for tracking data loading metrics
 * Helps optimize hybrid loading strategies based on real-world usage
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalTime: number;
    loadTime: number;
    filterTime: number;
    renderTime: number;
    avgResponseTime: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private enabled: boolean;

  constructor() {
    // Only enable in development or when explicitly requested
    this.enabled = import.meta.env.DEV || 
                   typeof window !== 'undefined' && 
                   window.localStorage?.getItem('enablePerfMonitoring') === 'true';
  }

  /**
   * Start timing a specific operation
   */
  startMark(name: string): void {
    if (!this.enabled) return;
    
    this.marks.set(name, performance.now());
  }

  /**
   * End timing and record the metric
   */
  endMark(name: string, metadata?: Record<string, any>): number {
    if (!this.enabled) return 0;
    
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for ${name}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.metrics.push({
      name,
      value: duration,
      timestamp: Date.now(),
      metadata,
    });
    
    this.marks.delete(name);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }
    
    return duration;
  }

  /**
   * Measure a specific operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startMark(name);
    try {
      const result = await operation();
      this.endMark(name, metadata);
      return result;
    } catch (error) {
      this.endMark(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Track data loading performance
   */
  trackDataLoad(params: {
    strategy: 'client' | 'server' | 'hybrid';
    itemCount: number;
    filteredCount: number;
    pageSize?: number;
    duration: number;
  }): void {
    if (!this.enabled) return;
    
    this.metrics.push({
      name: 'data-load',
      value: params.duration,
      timestamp: Date.now(),
      metadata: {
        strategy: params.strategy,
        itemCount: params.itemCount,
        filteredCount: params.filteredCount,
        pageSize: params.pageSize,
      },
    });
    
    // Analyze performance and suggest optimizations
    this.analyzePerformance(params);
  }

  /**
   * Analyze performance and suggest optimizations
   */
  private analyzePerformance(params: {
    strategy: string;
    itemCount: number;
    duration: number;
  }): void {
    const itemsPerMs = params.itemCount / params.duration;
    
    // Suggest optimization if performance is poor
    if (params.duration > 500 && params.strategy === 'client' && params.itemCount > 100) {
      console.info(
        `Performance tip: Consider using server-side filtering for ${params.itemCount} items. ` +
        `Current load time: ${params.duration.toFixed(0)}ms`
      );
    }
    
    if (params.duration > 2000) {
      console.warn(
        `Slow data load detected: ${params.duration.toFixed(0)}ms for ${params.itemCount} items. ` +
        `Consider pagination or server-side filtering.`
      );
    }
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const loadMetrics = this.metrics.filter(m => m.name.includes('load'));
    const filterMetrics = this.metrics.filter(m => m.name.includes('filter'));
    const renderMetrics = this.metrics.filter(m => m.name.includes('render'));
    
    const avgTime = (metrics: PerformanceMetric[]) => 
      metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length 
        : 0;
    
    return {
      metrics: [...this.metrics],
      summary: {
        totalTime: this.metrics.reduce((sum, m) => sum + m.value, 0),
        loadTime: avgTime(loadMetrics),
        filterTime: avgTime(filterMetrics),
        renderTime: avgTime(renderMetrics),
        avgResponseTime: avgTime(this.metrics),
      },
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Export metrics for analysis
   */
  export(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * Log current performance summary
   */
  logSummary(): void {
    if (!this.enabled) return;
    
    const report = this.getReport();
    console.table({
      'Total Time': `${report.summary.totalTime.toFixed(0)}ms`,
      'Avg Load Time': `${report.summary.loadTime.toFixed(0)}ms`,
      'Avg Filter Time': `${report.summary.filterTime.toFixed(0)}ms`,
      'Avg Render Time': `${report.summary.renderTime.toFixed(0)}ms`,
      'Avg Response Time': `${report.summary.avgResponseTime.toFixed(0)}ms`,
      'Total Operations': this.metrics.length,
    });
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const startMark = (name: string) => perfMonitor.startMark(name);
  const endMark = (name: string, metadata?: Record<string, any>) => 
    perfMonitor.endMark(name, metadata);
  
  const measure = async <T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ) => perfMonitor.measure(name, operation, metadata);
  
  const trackDataLoad = (params: Parameters<typeof perfMonitor.trackDataLoad>[0]) =>
    perfMonitor.trackDataLoad(params);
  
  return {
    startMark,
    endMark,
    measure,
    trackDataLoad,
    getReport: () => perfMonitor.getReport(),
    logSummary: () => perfMonitor.logSummary(),
  };
}