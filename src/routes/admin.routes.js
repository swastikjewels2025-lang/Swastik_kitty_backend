import { Router } from 'express';
import { 
  recordCashPaymentController, 
  confirmCashPickupController,
  recordDrawWinnerController, 
  updateDailyGoldRateController, 
  reviewKycController,
  getAdminDashboardStatsController,
  getAdminUsersController,
  getAdminUserDetailController,
  getPendingKycListController,
  getAdminPaymentsController,
  getAdminPickupsController,
  getAdminSchemesController,
  updateAdminSchemeController,
  deleteAdminSchemeController,
  getAdminMembershipsController,
  getAdminBookingsController,
  updateAdminBookingStatusController,
  getDrawEligibleMembersController,
  broadcastNotificationController,
  adminManualEnrollController,
  updateAdminUserController
} from '../controllers/admin.controller.js';
import { createSchemeController } from '../controllers/scheme.controller.js';
import { getLiveGoldRateController } from '../controllers/rate.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

// All admin routes strictly require authentication and ADMIN / SUPER_ADMIN role
router.use(authGuard, roleGuard('ADMIN', 'SUPER_ADMIN'));

// Analytics & Dashboard
router.get('/dashboard/stats', getAdminDashboardStatsController);

// User & Patron Management
router.get('/users', getAdminUsersController);
router.get('/users/:userId', getAdminUserDetailController);
router.patch('/users/:userId', updateAdminUserController);

// KYC Queue
router.get('/kyc/pending', getPendingKycListController);
router.patch('/kyc/:userId', reviewKycController);

// Payments & Ledger
router.get('/payments', getAdminPaymentsController);
router.post('/payments/record-cash', recordCashPaymentController);
router.post('/payments/confirm-cash-pickup', confirmCashPickupController);

// Cash Pickup Logistics
router.get('/pickups', getAdminPickupsController);
router.post('/cash-pickup/:id/verify-otp', confirmCashPickupController);

// Schemes Management
router.get('/schemes', getAdminSchemesController);
router.post('/schemes', createSchemeController);
router.patch('/schemes/:id', updateAdminSchemeController);
router.delete('/schemes/:id', deleteAdminSchemeController);

// Memberships & Chit Tokens
router.get('/memberships', getAdminMembershipsController);
router.post('/memberships/manual-enroll', adminManualEnrollController);

// Bullion & Coins Bookings
router.get('/bookings', getAdminBookingsController);
router.patch('/bookings/:id/status', updateAdminBookingStatusController);

// Gold Rates
router.get('/rates/gold', getLiveGoldRateController);
router.post('/rates/gold', updateDailyGoldRateController);

// Lucky Draw
router.get('/draw/eligible/:schemeId', getDrawEligibleMembersController);
router.post('/draw/record-winner', recordDrawWinnerController);

// Broadcast Notifications
router.post('/notifications/broadcast', broadcastNotificationController);

export default router;


