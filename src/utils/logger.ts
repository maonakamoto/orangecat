/**
 * PRODUCTION-SAFE LOGGER
 *
 * Replaces console.log statements with proper logging
 * that's safe for production use and provides structured logging.
 *
 * Created: 2025-06-30
 * Purpose: Eliminate console.log statements and provide structured logging
 */

// =====================================================================
// 🎯 LOGGER TYPES
// =====================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
}

// =====================================================================
// 🔧 LOGGER CONFIGURATION
// =====================================================================

const LOGGER_CONFIG = {
  // Only log errors and warnings in production
  productionLevel: 'warn' as LogLevel,

  // Log everything in development
  developmentLevel: 'debug' as LogLevel,

  // Get current environment
  get environment() {
    return process.env.NODE_ENV || 'development';
  },

  // Get active log level
  get activeLevel() {
    return this.environment === 'production' ? this.productionLevel : this.developmentLevel;
  },
};

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// =====================================================================
// 🔧 LOGGER IMPLEMENTATION
// =====================================================================

class Logger {
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOGGER_CONFIG.activeLevel as LogLevel];
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    source?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source,
    };
  }

  private output(entry: LogEntry): void {
    const { timestamp, level, message, data, source } = entry;

    // In production, use structured logging
    if (LOGGER_CONFIG.environment === 'production') {
      // Send to proper logging service in production
      // For now, use console for critical errors only
      if (level === 'error') {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(entry));
      }
      return;
    }

    // Development logging with colors and formatting
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    const sourceInfo = source ? ` (${source})` : '';
    const payload = data !== undefined ? data : '';

    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(prefix + sourceInfo + ':', message, payload);
        return;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(prefix + sourceInfo + ':', message, payload);
        return;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(prefix + sourceInfo + ':', message, payload);
        return;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(prefix + sourceInfo + ':', message, payload);
        return;
    }
  }

  debug(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog('debug')) {
      return;
    }
    this.output(this.formatLogEntry('debug', message, data, source));
  }

  info(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog('info')) {
      return;
    }
    this.output(this.formatLogEntry('info', message, data, source));
  }

  warn(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog('warn')) {
      return;
    }
    this.output(this.formatLogEntry('warn', message, data, source));
  }

  error(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog('error')) {
      return;
    }
    this.output(this.formatLogEntry('error', message, data, source));
  }

  // Specialized logging methods
  supabase(message: string, data?: unknown): void {
    this.info(`[Supabase] ${message}`, data, 'supabase');
  }

  auth(message: string, data?: unknown): void {
    this.info(`[Auth] ${message}`, data, 'auth');
  }

  api(message: string, data?: unknown): void {
    this.info(`[API] ${message}`, data, 'api');
  }

  database(message: string, data?: unknown): void {
    this.info(`[Database] ${message}`, data, 'database');
  }

  performance(message: string, data?: unknown): void {
    this.debug(`[Performance] ${message}`, data, 'performance');
  }
}

// =====================================================================
// 🔧 SINGLETON EXPORT
// =====================================================================

export const logger = new Logger();

// =====================================================================
// 🔧 HELPER FUNCTIONS
// =====================================================================
