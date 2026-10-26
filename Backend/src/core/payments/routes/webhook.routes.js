import express from 'express';
import { handleRazorpayxWebhook } from '../controllers/razorpayxWebhook.controller.js';

const router = express.Router();

/**
 * Endpoint for RazorpayX payout + bank-account validation events (Public, signature verified)
 * Path: /api/v1/payments/webhook/razorpayx
 */
router.post('/razorpayx', handleRazorpayxWebhook);

export default router;
