export class Logger {
  static info(message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] ${message}`, context ? JSON.stringify(context) : '');
  }

  static warn(message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] [${timestamp}] ${message}`, context ? JSON.stringify(context) : '');
  }

  static error(message: string, error?: any, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] [${timestamp}] ${message}`, error?.stack || error || '', context ? JSON.stringify(context) : '');
  }
}
