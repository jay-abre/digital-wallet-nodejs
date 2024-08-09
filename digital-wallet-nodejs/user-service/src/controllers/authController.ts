import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/userModel';
import validator from '../utils/validator';
import logger from '../utils/logger';

interface UserRequest extends Request {
  body: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }
}

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ id: userId }, secret, { expiresIn: '1d' });
};

const validatePasswordComplexity = (password: string): boolean => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const register = async (req: UserRequest, res: Response): Promise<void> => {
  try {
    const { error } = validator.validateUser(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const { email, password, firstName, lastName } = req.body;

    // Validate password complexity
    if (!validatePasswordComplexity(password)) {
      res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.' });
      return;
    }

    let user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({ email, password: hashedPassword, firstName, lastName });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({ token, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    logger.error('Error in user registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: UserRequest, res: Response): Promise<void> => {
  try {
    const { error } = validator.validateLogin(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user._id);

    res.json({ token, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    logger.error('Error in user login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};