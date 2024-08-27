import { Request, Response, NextFunction } from 'express';
import logger from '../../../shared/logger';

// Error handling middleware function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ message: 'Internal Server Error' });
};


export default errorMiddleware;
