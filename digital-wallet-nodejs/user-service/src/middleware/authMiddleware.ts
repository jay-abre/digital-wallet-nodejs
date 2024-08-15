import { Request, Response, NextFunction } from 'express';
import { rolePermissions } from '../config/roles';
import { isBlacklisted } from '../utils/tokenBlacklist';
import jwt from 'jsonwebtoken';

interface UserWithRole {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserWithRole;
    }
  }
}

export const checkRole = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as UserWithRole | undefined;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userPermissions = rolePermissions[user.role];

    if (!userPermissions) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  if (isBlacklisted(token)) {
    return res.status(401).json({ message: 'Unauthorized: Token has been invalidated.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserWithRole;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }
};