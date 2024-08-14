import { Request, Response, NextFunction } from 'express';

export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.role;

  if (userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  next();
};