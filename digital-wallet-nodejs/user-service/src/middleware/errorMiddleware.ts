import { Request, Response, NextFunction } from 'express';
import logger from '../../../shared/logger'

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, any>;
  errors?: Record<string, any>;
}

const errorHandler = (err: MongoError, req: Request, res: Response, next: NextFunction): void => {
  logger.error(err.stack || '');

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((error: any) => error.message);
    res.status(400).json({ error: errors });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    res.status(400).json({ error: `${field} already exists.` });
    return;
  }

  // Generic error handler
  res.status(500).json({ error: 'An unexpected error occurred.' });
};

export default errorHandler;