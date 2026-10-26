import express from 'express';
import uploadRoutes from '../modules/uploads/routes/upload.routes.js';
import fcmRoutes from '../core/notifications/fcm.routes.js';
import webhookRoutes from '../core/payments/routes/webhook.routes.js';
import { authenticate } from '../modules/taxi/middlewares/authMiddleware.js';
import { getQueuesController } from '../controllers/admin.controller.js';
import { taxiRouter } from '../modules/taxi/routes/index.js';
import { promotionsRouter as taxiPromotionsRouter } from '../modules/taxi/admin/promotions/routes/index.js';

const router = express.Router();

router.get('/v1/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

router.use('/v1/uploads', uploadRoutes);
router.use('/v1/payments/webhook', webhookRoutes);
router.use('/v1/fcm-tokens', fcmRoutes);
router.use('/fcm-tokens', fcmRoutes);

router.get('/v1/admin/queues', authenticate(['admin']), getQueuesController);
router.use('/v1', taxiPromotionsRouter);

router.use('/v1/taxi', taxiRouter);

export default router;
