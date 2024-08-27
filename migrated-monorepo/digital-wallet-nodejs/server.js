import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import config from './config';
import routes from './routes';
import errorMiddleware from './middleware/error.middleware';
const app = express();
mongoose.connect(config.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
console.log(process.env);
app.use(cors());
app.use(express.json());
// Use routes
app.use('/api', routes);
// Error handling middleware
app.use(errorMiddleware);
const PORT = config.port || 5000; // Fallback to port 5000 if not defined
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
export default app;
