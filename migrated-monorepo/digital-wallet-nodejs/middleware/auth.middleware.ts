import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import config from '../config.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

type RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<Response<any, Record<string, any>> | void>;

const authenticateJWT: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    (req as AuthenticatedRequest).user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const authenticateAdmin: RequestHandler = async (req, res, next) => {
  await authenticateJWT(req, res, () => {
    if ((req as AuthenticatedRequest).user && (req as AuthenticatedRequest).user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
  });
};

export {authenticateJWT, authenticateAdmin, AuthenticatedRequest};