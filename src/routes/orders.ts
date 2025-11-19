import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { auth } from '../middleware/auth';

const router = Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, orderController.validateCreateOrder, orderController.createOrder);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, orderController.getUserOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, orderController.getOrderById);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', auth, orderController.cancelOrder);

// @route   POST /api/orders/:id/payment
// @desc    Process payment for order
// @access  Private
router.post('/:id/payment', auth, orderController.processPayment);

// @route   POST /api/orders/:id/payment/crypto
// @desc    Process crypto payment for order
// @access  Private
router.post('/:id/payment/crypto', auth, orderController.processCryptoPayment);

// @route   GET /api/orders/:id/tracking
// @desc    Get order tracking info
// @access  Private
router.get('/:id/tracking', auth, orderController.getOrderTracking);

export default router;