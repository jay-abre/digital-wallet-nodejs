import express, { Application } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';


// Import routes from different services
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import kycRoutes from './routes/kycRoutes';
import walletRoutes from '../../account-service/routes/walletRoutes'; // Import account service routes

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Manually set environment variables if not loaded
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://root:example@localhost:27017';
}

const app: Application = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
