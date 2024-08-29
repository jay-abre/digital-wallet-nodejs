import express, { Application } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from './config';
import routes from './routes';
import errorMiddleware from './middleware/error.middleware';

dotenv.config(); // Load .env file

// Initialize the Express application
const app: Application = express();

// Construct the MongoDB URI from environment variables
const mongoURI: string = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@digital-wallet.npon6.mongodb.net/?retryWrites=true&w=majority&appName=digital-wallet`;
console.log('MongoDB URI:', mongoURI);

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err: Error) => console.error('MongoDB connection error:', err));

// Middleware setup
app.use(cors());
app.use(express.json());

// Use routes
app.use('/api', routes);

// Error handling middleware
app.use(errorMiddleware);

// Start the server
const PORT: number = config.port || 3001;// Default to 8082 if config.port is undefined

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the app for testing or other purposes
export default app;
