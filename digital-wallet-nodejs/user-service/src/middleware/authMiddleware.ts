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
      return res.status(401).json({ message: 'Unauthorized: No user found.' });
    }

    if (typeof user.role !== 'string') {
      return res.status(403).json({ message: 'Forbidden: User role is not valid.' });
    }

    const normalizedRole = user.role.toLowerCase();
    const role = Object.keys(rolePermissions).find(key => key.toLowerCase() === normalizedRole);

    if (!role) {
      return res.status(403).json({ message: `Forbidden: Role ${user.role} not recognized.` });
    }

    const userPermissions = rolePermissions[role];
    if (!userPermissions) {
      return res.status(403).json({ message: `Forbidden: No permissions found for role ${role}.` });
    }

    const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({ message: `Forbidden: Required permissions are ${requiredPermissions.join(', ')}` });
    }

    next();
  };
};


export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log('Token:', token); // Debugging log

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  if (isBlacklisted(token)) {
    return res.status(401).json({ message: 'Unauthorized: Token has been invalidated.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserWithRole;
    req.user = decoded;
    console.log('Decoded User:', decoded); // Debugging log
    next();
  } catch (error) {
    console.error('Token Verification Error:', error); // Debugging log
    return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }
};

