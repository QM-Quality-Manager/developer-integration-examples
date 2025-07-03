const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'qmplus-directory-integration' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'integration.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add request/response logging helper
logger.logRequest = (method, url, data = null) => {
  logger.debug('API Request', {
    method,
    url,
    hasData: !!data,
    dataSize: data ? JSON.stringify(data).length : 0
  });
};

logger.logResponse = (method, url, status, data = null) => {
  const level = status >= 400 ? 'error' : 'debug';
  logger.log(level, 'API Response', {
    method,
    url,
    status,
    hasData: !!data,
    dataSize: data ? JSON.stringify(data).length : 0
  });
};

// Add transaction logging helpers
logger.logTransaction = (action, transactionId, details = {}) => {
  logger.info(`Transaction ${action}`, {
    transactionId,
    action,
    ...details
  });
};

logger.logProgress = (transactionId, completed, total, message = '') => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  logger.info('Transaction Progress', {
    transactionId,
    completed,
    total,
    percentage: `${percentage}%`,
    message
  });
};

// Add sync operation logging
logger.logSyncStart = (operation, count, options = {}) => {
  logger.info(`Starting ${operation}`, {
    operation,
    count,
    ...options
  });
};

logger.logSyncResult = (operation, result) => {
  const level = result.failedOperations > 0 ? 'warn' : 'info';
  logger.log(level, `${operation} completed`, {
    operation,
    total: result.totalOperations,
    successful: result.successfulOperations,
    failed: result.failedOperations,
    successRate: result.totalOperations > 0 
      ? `${Math.round((result.successfulOperations / result.totalOperations) * 100)}%`
      : '0%'
  });
};

// Add performance timing
logger.time = (label) => {
  const start = Date.now();
  return {
    end: (message = '') => {
      const duration = Date.now() - start;
      logger.info(`Timer: ${label}`, {
        label,
        duration: `${duration}ms`,
        message
      });
      return duration;
    }
  };
};

// Add error helpers
logger.logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    code: error.code,
    status: error.status,
    stack: error.stack,
    ...context
  });
};

logger.logValidationError = (errors, context = {}) => {
  logger.error('Validation failed', {
    errors: Array.isArray(errors) ? errors : [errors],
    errorCount: Array.isArray(errors) ? errors.length : 1,
    ...context
  });
};

// Add authentication logging
logger.logAuth = (action, result, details = {}) => {
  const level = result ? 'info' : 'error';
  logger.log(level, `Authentication ${action}`, {
    action,
    result,
    ...details
  });
};

module.exports = logger;