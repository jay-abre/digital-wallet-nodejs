import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import logger from '../../../shared/logger'
import { UserWithRole } from '@/types/types';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user as UserWithRole; // Use type assertion here
    next();
  } catch (error) {
    logger.error('Error verifying token:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};