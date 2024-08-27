import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
// Use named import for mongoose
import path from 'path';
// Import routes from different services
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import kycRoutes from './routes/kycRoutes';
import walletRoutes from '../../account-service/src/routes/walletRoutes'; // Import account service routes

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Manually set environment variables if not loaded
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://root:example@localhost:27017';
}

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware setup
app.use(cors());
app.use(express.json());

// Use imported routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/wallets', walletRoutes); // Add route for account service

// Error handling middleware
import errorMiddleware from './middleware/errorMiddleware';
app.use(errorMiddleware);

const PORT = process.env.PORT1 || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
