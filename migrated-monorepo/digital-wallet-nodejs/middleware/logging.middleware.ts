import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`, {
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip
  });
  next();
};

export default requestLogger;