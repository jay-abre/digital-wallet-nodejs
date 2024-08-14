import { Request, Response, NextFunction } from 'express';
import { rolePermissions } from '../config/roles';

export const checkRole = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

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