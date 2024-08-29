import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/user.model';
import logger from '../utils/logger';
import config from '../config';

interface DecodedToken extends JwtPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: any; // Replace `any` with a more specific type if needed
    }
  }
}

const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Access denied. Invalid token format.' });
      return;
    }

    // Ensure jwtSecret is a string and not undefined
    if (!config.jwtSecret) {
      res.status(500).json({ error: 'Internal server error. JWT secret not configured.' });
      return;
    }

    // Verify token and assert type
    const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ error: 'Invalid token. User not found.' });
      return;
    }

    req.user = user;
    next();
  } catch (error: unknown) {
    logger.error('Authentication error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token.' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired.' });
    } else {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
};

const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  authenticateJWT(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
  });
};

export { authenticateJWT, authenticateAdmin };
