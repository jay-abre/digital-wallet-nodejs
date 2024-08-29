import winston, { Logger, transports, format } from 'winston';

// Define the logger configuration
const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
  ),
  defaultMeta: { service: 'e-wallet-api' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
        format.colorize(),
        format.simple()
    )
  }));
}

export default logger;
