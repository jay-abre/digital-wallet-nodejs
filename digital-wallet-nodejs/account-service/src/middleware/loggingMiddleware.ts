// account-service/middleware/loggingMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../../../shared/logger';

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
};

export default loggingMiddleware;