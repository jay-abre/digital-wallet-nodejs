import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import mongoose, { Error as MongooseError } from 'mongoose';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';

// Extend the standard Error class for custom application errors
class ApplicationError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'ApplicationError';
  }
}

// Type for Mongoose Validation Error
interface ValidationError extends MongooseError {
  errors: { [key: string]: { message: string } };
}

// Type for Mongoose Duplicate Key Error
interface DuplicateKeyError extends MongooseError {
  code: number;
  keyValue: { [key: string]: any };
}

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error(err.stack || 'Unknown error');

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values((err as ValidationError).errors).map(error => error.message);
    res.status(400).json({ error: errors });
    return;
  }

  // Mongoose duplicate key error
  if (err instanceof mongoose.Error && (err as DuplicateKeyError).code === 11000) {
    const field = Object.keys((err as DuplicateKeyError).keyValue)[0];
    res.status(400).json({ error: `${field} already exists.` });
    return;
  }

  // JWT authentication error
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Custom application errors
  if (err instanceof ApplicationError) {
    res.status(err.status || 400).json({ error: err.message });
    return;
  }

  // Stripe errors
  if (err instanceof Error && err.name === 'StripeError') {
    res.status(400).json({ error: err.message });
    return;
  }

  // Default to 500 server error
  res.status(500).json({ error: 'Internal Server Error' });
};

export default errorHandler;
