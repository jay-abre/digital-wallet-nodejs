import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import logger from '../utils/logger';
import config from '../config';
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access denied. Invalid token format.' });
        }
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
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
const authenticateAdmin = async (req, res, next) => {
    await authenticateJWT(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        }
        else {
            res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
    });
};
export { authenticateJWT, authenticateAdmin };
