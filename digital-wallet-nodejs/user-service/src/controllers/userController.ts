import { Request, Response } from 'express';
import User from '../models/userModel';
import logger from '../utils/logger';

export const assignRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: 'Role assigned successfully', user });
  } catch (error) {
    logger.error('Error in assigning role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};