import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import schemeRoutes from './scheme.routes.js';
import membershipRoutes from './membership.routes.js';
import paymentRoutes from './payment.routes.js';

const apiRouter = Router();

// Mount modules
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/schemes', schemeRoutes);
apiRouter.use('/memberships', membershipRoutes);
apiRouter.use('/payments', paymentRoutes);

export default apiRouter;
