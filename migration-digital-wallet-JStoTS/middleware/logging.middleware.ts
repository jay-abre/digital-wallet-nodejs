import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Define the middleware function
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  logger.info(`${req.method} ${req.url}`, {
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip
  });
  next();
};

export default requestLogger;
