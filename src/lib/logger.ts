/**
 * Structured logger for production use
 * Replaces console.log/error with level-based logging
 * In production, consider integrating with Sentry, LogRocket, or similar services
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Set log level based environment
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  development: LogLevel.DEBUG,
  production: LogLevel.WARN,
  test: LogLevel.ERROR
}

const CURRENT_LOG_LEVEL = LOG_LEVEL_MAP[process.env.NODE_ENV || 'production'] ?? LogLevel.WARN

interface LogContext {
  [key: string]: unknown
}

function formatMessage(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const base = `[${timestamp}] [${level}] ${message}`
  
  if (context && Object.keys(context).length > 0) {
    try {
      return `${base} ${JSON.stringify(context)}`
    } catch {
      return `${base} (context serialization failed)`
    }
  }
  
  return base
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, context?: LogContext): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
    console.debug(formatMessage('DEBUG', message, context))
  }
}

/**
 * Log informational message
 */
export function logInfo(message: string, context?: LogContext): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
    console.info(formatMessage('INFO', message, context))
  }
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: LogContext): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
    console.warn(formatMessage('WARN', message, context))
  }
}

/**
 * Log error message
 * In production, this is where you'd send to error tracking service
 */
export function logError(message: string, error?: Error | unknown, context?: LogContext): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
    const errorContext = error instanceof Error 
      ? { ...context, error: error.message, stack: error.stack }
      : { ...context, error: String(error) }
    
    console.error(formatMessage('ERROR', message, errorContext))
    
    // TODO: In production, send to error tracking service
    // Example: Sentry.captureException(error, { contexts: { custom: context } })
  }
}

/**
 * Log API request error (convenience wrapper)
 */
export function logApiError(
  endpoint: string, 
  error: Error | unknown, 
  requestContext?: LogContext
): void {
  logError(`API Error: ${endpoint}`, error, {
    endpoint,
    ...requestContext
  })
}

/**
 * Log database error (convenience wrapper)
 */
export function logDatabaseError(
  operation: string,
  table: string,
  error: Error | unknown,
  queryContext?: LogContext
): void {
  logError(`Database Error: ${operation} on ${table}`, error, {
    operation,
    table,
    ...queryContext
  })
}

// Default export for convenience
export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  apiError: logApiError,
  dbError: logDatabaseError
}
