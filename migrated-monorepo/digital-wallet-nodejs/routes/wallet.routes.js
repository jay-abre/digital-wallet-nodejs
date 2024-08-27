import express from "express";
import WalletService from "../services/wallet.service";
import { authenticateJWT } from "../middleware/auth.middleware";
const router = express.Router();
router.post("/create", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const wallet = await WalletService.createWallet(user.id, user.email, req.body.initialBalance);
        res.status(201).json(wallet);
    }
    catch (error) {
        if (error.message.includes("KYC verification")) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(400).json({ error: error.message });
        }
    }
});
router.post("/confirm-payment-intent", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { paymentIntentId, paymentMethodId } = req.body;
        const result = await WalletService.confirmPaymentIntent(user.id, paymentIntentId, paymentMethodId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get("/payment-status/:paymentIntentId", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { paymentIntentId } = req.params;
        const status = await WalletService.getPaymentStatus(user.id, paymentIntentId);
        res.json(status);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get("/balance", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const balance = await WalletService.getBalance(user.id);
        res.json(balance);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/add-payment-method", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { paymentMethodId } = req.body;
        const result = await WalletService.addPaymentMethod(user.id, paymentMethodId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get("/payment-methods", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const paymentMethods = await WalletService.listPaymentMethods(user.id);
        res.json(paymentMethods);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.delete("/payment-methods/:paymentMethodId", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { paymentMethodId } = req.params;
        await WalletService.deletePaymentMethod(user.id, paymentMethodId);
        res.json({ message: 'Payment method deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/withdraw", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { amount } = req.body;
        const result = await WalletService.withdraw(user.id, amount);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/transfer", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { toUserId, amount } = req.body;
        const result = await WalletService.transfer(user.id, toUserId, amount);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get("/transactions", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const transactions = await WalletService.getTransactions(user.id);
        res.json(transactions);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/deposit", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { amount, paymentMethodId } = req.body;
        const result = await WalletService.deposit(user.id, amount, paymentMethodId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/generate-qr", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { amount } = req.body;
        const qrCode = await WalletService.generatePaymentQR(user.id, amount);
        res.json(qrCode);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/initiate-qr-payment", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { paymentId, paymentMethodId } = req.body;
        if (!paymentId || !paymentMethodId) {
            return res.status(400).json({ error: 'paymentId and paymentMethodId are required' });
        }
        const result = await WalletService.initiateQRPayment(paymentId, user.id, paymentMethodId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post("/confirm-qr-payment", authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const { paymentIntentId, paymentMethodId } = req.body;
        const result = await WalletService.confirmQRPayment(user.id, paymentIntentId, paymentMethodId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
export default router;
