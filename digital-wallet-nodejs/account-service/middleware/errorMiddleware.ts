// account-service/middleware/errorMiddleware.ts
import { Request, Response } from 'express';
import logger from '../../shared/logger';

const errorMiddleware = (err: Error, req: Request, res: Response) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ message: 'Internal Server Error' });
};

export default errorMiddleware;