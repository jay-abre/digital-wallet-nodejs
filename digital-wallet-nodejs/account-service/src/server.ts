import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import authRoutes from '../../user-service/src/routes/authRoutes';
import userRoutes from '../../user-service/src/routes/userRoutes';
import kycRoutes from '../../user-service/src/routes/kycRoutes';
import walletRoutes from './routes/walletRoutes'; // Adjust path if necessary

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Manually set environment variables if not loaded
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://root:example@localhost:27017';
}

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware setup
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  next();
});

// Use imported routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/wallets', walletRoutes);  // Add route for account service

// Error handling middleware
import errorMiddleware from './middleware/errorMiddleware';
app.use(errorMiddleware);

const PORT = process.env.PORT2 || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
