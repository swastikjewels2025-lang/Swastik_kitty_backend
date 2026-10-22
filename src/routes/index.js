import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import schemeRoutes from './scheme.routes.js';
import membershipRoutes from './membership.routes.js';
import paymentRoutes from './payment.routes.js';
import rateRoutes from './rate.routes.js';
import adminRoutes from './admin.routes.js';
import bookingRoutes from './booking.routes.js';
import notificationRoutes from './notification.routes.js';
import coinRoutes from './coin.routes.js';

const apiRouter = Router();

// Mount modules
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/schemes', schemeRoutes);
apiRouter.use('/memberships', membershipRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/rates', rateRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/coins', coinRoutes);

export default apiRouter;
