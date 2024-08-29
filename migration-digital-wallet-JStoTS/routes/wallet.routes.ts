import express, { Request, Response, NextFunction, Router } from 'express';
import WalletService from '../services/wallet.service';
import { authenticateJWT } from '../middleware/auth.middleware';
import logger from "../utils/logger";

const router: Router = express.Router();

// Define types for request body and parameters if needed
interface CreateWalletRequest extends Request {
  body: {
    initialBalance: number;
  };
}

interface CreatePaymentIntentRequest extends Request {
  body: {
    amount: number;
  };
}

interface ConfirmPaymentIntentRequest extends Request {
  body: {
    paymentIntentId: string;
    paymentMethodId: string;
  };
}

interface PaymentStatusRequest extends Request {
  params: {
    paymentIntentId: string;
  };
}

interface AddPaymentMethodRequest extends Request {
  body: {
    paymentMethodId: string;
  };
}
interface CreateWalletRequestBody {
  email: string;
  initialBalance: number;
}


interface WithdrawRequest extends Request {
  body: {
    amount: number;
  };
}

interface TransferRequest extends Request {
  body: {
    toUserId: string;
    amount: number;
  };
}

interface DepositRequest extends Request {
  body: {
    amount: number;
    paymentMethodId: string;
  };
}

interface GenerateQRRequest extends Request {
  body: {
    amount: number;
  };
}

interface InitiateQRPaymentRequest extends Request {
  body: {
    paymentId: string;
    paymentMethodId: string;
  };
}

interface ConfirmQRPaymentRequest extends Request {
  body: {
    paymentIntentId: string;
    paymentMethodId: string;
  };
}

router.post('/create', authenticateJWT, async (req: Request<{}, {}, CreateWalletRequestBody>, res: Response) => {
  try {
    const { initialBalance, email } = req.body;
    const userId = req.user.id; // Ensure req.user contains the authenticated user's information

    logger.info("Request Body:", req.body);
    logger.info("User ID:", userId);

    // Validate the request data
    if (!userId || initialBalance === undefined || initialBalance < 0) {
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    // Call createWallet with the correct parameters
    const wallet = await WalletService.createWallet({ userId, email, initialBalance });
    res.status(201).json(wallet);
  } catch (error) {
    if ((error as Error).message.includes('KYC verification')) {
      res.status(403).json({ error: (error as Error).message });
    } else {
      res.status(400).json({ error: (error as Error).message });
    }
  }
});



router.post('/create-payment-intent', authenticateJWT, async (req: CreatePaymentIntentRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await WalletService.createPaymentIntent(
        req.user.id,
        amount
    );
    res.json(paymentIntent);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/confirm-payment-intent', authenticateJWT, async (req: ConfirmPaymentIntentRequest, res: Response) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;
    const result = await WalletService.confirmPaymentIntent(
        req.user.id,
        paymentIntentId,
        paymentMethodId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/payment-status/:paymentIntentId', authenticateJWT, async (req: PaymentStatusRequest, res: Response) => {
  try {
    const { paymentIntentId } = req.params;
    const status = await WalletService.getPaymentStatus(req.user.id, paymentIntentId);
    res.json(status);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/balance', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const balance = await WalletService.getBalance(req.user.id);
    res.json(balance);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/add-payment-method', authenticateJWT, async (req: AddPaymentMethodRequest, res: Response) => {
  try {
    const { paymentMethodId } = req.body;
    const result = await WalletService.addPaymentMethod(
        req.user.id,
        paymentMethodId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/payment-methods', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const paymentMethods = await WalletService.listPaymentMethods(req.user.id);
    res.json(paymentMethods);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/payment-methods/:paymentMethodId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;
    await WalletService.deletePaymentMethod(req.user.id, paymentMethodId);
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/withdraw', authenticateJWT, async (req: WithdrawRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const result = await WalletService.withdraw(req.user.id, amount);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/transfer', authenticateJWT, async (req: TransferRequest, res: Response) => {
  try {
    const { toUserId, amount } = req.body;
    const result = await WalletService.transfer(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/transactions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const transactions = await WalletService.getTransactions(req.user.id);
    res.json(transactions);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/deposit', authenticateJWT, async (req: DepositRequest, res: Response) => {
  try {
    const { amount, paymentMethodId } = req.body;
    const result = await WalletService.deposit(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;