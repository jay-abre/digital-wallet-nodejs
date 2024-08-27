import { Router } from 'express';
import TransactionController from '../controller/TransactionController';
import { authenticate, checkRole } from '../../user-service/src/middleware/authMiddleware'

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Define routes
router.post('/transactions', checkRole(['admin', 'user']), TransactionController.createTransaction);
router.get('/transactions/:id', checkRole(['admin', 'user']), TransactionController.getTransaction);

// Export the router
export default router;
