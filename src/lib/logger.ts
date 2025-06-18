enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  userId?: string;
  tenantId?: string;
  operationId?: string;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.level = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'TRACE': return LogLevel.TRACE;
      default: return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatLog(level: string, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };
  }

  private writeLog(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Pretty print for development
      const color = this.getColor(entry.level);
      const prefix = `[${entry.timestamp}] ${entry.level}:`;
      console.log(`${color}${prefix}${'\x1b[0m'} ${entry.message}`);
      if (entry.context) {
        console.log('  Context:', entry.context);
      }
    } else {
      // JSON format for production
      console.log(JSON.stringify(entry));
    }
  }

  private getColor(level: string): string {
    switch (level) {
      case 'ERROR': return '\x1b[31m'; // Red
      case 'WARN': return '\x1b[33m';  // Yellow
      case 'INFO': return '\x1b[36m';  // Cyan
      case 'DEBUG': return '\x1b[32m'; // Green
      case 'TRACE': return '\x1b[35m'; // Magenta
      default: return '\x1b[0m';       // Reset
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.formatLog('ERROR', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.formatLog('WARN', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.formatLog('INFO', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.formatLog('DEBUG', message, context));
    }
  }

  trace(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      this.writeLog(this.formatLog('TRACE', message, context));
    }
  }

  // Operation tracking methods
  startOperation(operationName: string, context?: LogContext): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.info(`Starting operation: ${operationName}`, { 
      operationId, 
      operation: operationName,
      ...context 
    });
    return operationId;
  }

  endOperation(operationId: string, operationName: string, context?: LogContext): void {
    this.info(`Completed operation: ${operationName}`, { 
      operationId, 
      operation: operationName,
      ...context 
    });
  }

  // Performance tracking
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
    if (context) {
      this.debug(`Timer completed: ${label}`, context);
    }
  }

  // Structured logging for common operations
  document = {
    upload: (fileName: string, size: number, tenantId: string) => 
      this.info('Document upload started', { fileName, size, tenantId, operation: 'document_upload' }),
    
    uploaded: (fileName: string, chunks: number, tenantId: string) => 
      this.info('Document upload completed', { fileName, chunks, tenantId, operation: 'document_upload' }),
    
    delete: (fileName: string, tenantId: string) => 
      this.info('Document deleted', { fileName, tenantId, operation: 'document_delete' }),
    
    search: (query: string, resultCount: number, tenantId: string, duration?: number) => 
      this.info('Document search completed', { query: query.substring(0, 100), resultCount, tenantId, duration, operation: 'document_search' }),
  };

  web = {
    scrapeStart: (url: string, tenantId: string) => 
      this.info('Web scraping started', { url, tenantId, operation: 'web_scrape' }),
    
    scrapeComplete: (url: string, contentLength: number, tenantId: string) => 
      this.info('Web scraping completed', { url, contentLength, tenantId, operation: 'web_scrape' }),
    
    analysisStart: (url: string, tenantId: string) => 
      this.info('Web analysis started', { url, tenantId, operation: 'web_analysis' }),
    
    analysisComplete: (url: string, chunks: number, tenantId: string) => 
      this.info('Web analysis completed', { url, chunks, tenantId, operation: 'web_analysis' }),
  };

  auth = {
    signIn: (userId: string, provider: string) => 
      this.info('User signed in', { userId, provider, operation: 'auth_signin' }),
    
    signOut: (userId: string) => 
      this.info('User signed out', { userId, operation: 'auth_signout' }),
    
    ssoDetected: (url: string) => 
      this.info('SSO authentication detected', { url, operation: 'sso_auth' }),
  };

  database = {
    query: (operation: string, duration?: number, rowCount?: number) => 
      this.debug('Database query executed', { operation, duration, rowCount }),
    
    migration: (migration: string) => 
      this.info('Database migration executed', { migration, operation: 'db_migration' }),
    
    connection: (status: 'connected' | 'disconnected' | 'error') => 
      this.info(`Database ${status}`, { status, operation: 'db_connection' }),
  };
}

// Create singleton instance
export const logger = new Logger();

// Export for testing or configuration
export { Logger, LogLevel }; 