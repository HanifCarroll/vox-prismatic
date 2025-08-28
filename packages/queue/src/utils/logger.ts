// Simple logger utility for queue operations
export class QueueLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  log(message: string, ...args: any[]): void {
    console.log(`[${new Date().toISOString()}] [${this.context}] ${message}`, ...args);
  }

  error(message: string, error?: any): void {
    console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`, error);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG: ${message}`, ...args);
    }
  }
}