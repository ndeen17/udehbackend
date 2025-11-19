import { Request, Response } from 'express';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { emailService } from '../services/emailService';
import { body, validationResult } from 'express-validator';

class OrderController {
  // Validation middleware
  validateCreateOrder = [
    body('shippingAddress.firstName')
      .notEmpty()
      .withMessage('First name is required'),
    body('shippingAddress.lastName')
      .notEmpty()
      .withMessage('Last name is required'),
    body('shippingAddress.addressLine1')
      .notEmpty()
      .withMessage('Address line 1 is required'),
    body('shippingAddress.city')
      .notEmpty()
      .withMessage('City is required'),
    body('shippingAddress.postalCode')
      .notEmpty()
      .withMessage('Postal code is required'),
    body('shippingAddress.country')
      .notEmpty()
      .withMessage('Country is required'),
    body('paymentMethod')
      .notEmpty()
      .withMessage('Payment method is required')
  ];

  async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendErrorResponse(res, 'Validation failed', 400, errors.array());
        return;
      }

      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const userId = req.user.id;
      const { shippingAddress, paymentMethod, notes } = req.body;

      // Get user's cart
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        sendErrorResponse(res, 'Cart is empty', 400);
        return;
      }

      // Verify stock availability for all items
      for (const item of cart.items) {
        const product = await Product.findById(item.product);
        if (!product || !product.isActive) {
          sendErrorResponse(res, `Product ${item.product} is no longer available`, 400);
          return;
        }
        if (product.stockQuantity < item.quantity) {
          sendErrorResponse(res, `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`, 400);
          return;
        }
      }

      // Calculate order totals
      const subtotal = cart.totalAmount;
      const shippingCost = subtotal >= 100 ? 0 : 10; // Free shipping over $100
      const tax = subtotal * 0.08; // 8% tax rate
      const total = subtotal + shippingCost + tax;

      // Generate order number
      const orderNumber = (Order as any).generateOrderNumber();

      // Create order items from cart
      const orderItems = cart.items.map(item => {
        const product = item.product as any;
        return {
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          productSnapshot: {
            name: product.name,
            slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: product.description || '',
            images: product.images?.map((img: any) => img.url) || [],
            category: product.category?.name || 'Uncategorized'
          }
        };
      });

      // Create the order
      const order = new Order({
        user: userId,
        orderNumber,
        items: orderItems,
        subtotal,
        shippingAmount: shippingCost,
        taxAmount: tax,
        totalAmount: total,
        shippingAddress,
        paymentMethod,
        notes,
        paymentStatus: 'pending',
        status: 'pending'
      });

      await order.save();

      // Update product stock
      for (const item of cart.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: -item.quantity } }
        );
      }

      // Clear the cart
      cart.items = [];
      cart.calculateTotals();
      await cart.save();

      // Send confirmation email
      try {
        await emailService.sendOrderConfirmationEmail(
          req.user.email,
          req.user.name,
          orderNumber,
          total
        );
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }

      sendSuccessResponse(res, {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          total: order.totalAmount,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt
        }
      }, 'Order created successfully');
    } catch (error: any) {
      console.error('Create order error:', error);
      sendErrorResponse(res, error.message || 'Failed to create order', 500);
    }
  }

  async getUserOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('orderNumber totalAmount status paymentStatus createdAt items');

      const totalOrders = await Order.countDocuments({ user: userId });

      sendSuccessResponse(res, {
        orders,
        pagination: {
          page,
          limit,
          total: totalOrders,
          pages: Math.ceil(totalOrders / limit)
        }
      }, 'Orders retrieved successfully');
    } catch (error: any) {
      console.error('Get orders error:', error);
      sendErrorResponse(res, 'Failed to get orders', 500);
    }
  }

  async getOrderById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate('items.product', 'name slug images');

      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      sendSuccessResponse(res, { order }, 'Order retrieved successfully');
    } catch (error: any) {
      console.error('Get order error:', error);
      sendErrorResponse(res, 'Failed to get order', 500);
    }
  }

  async cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findOne({ _id: orderId, user: userId });

      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      if (!['pending', 'processing'].includes(order.status)) {
        sendErrorResponse(res, 'Order cannot be cancelled', 400);
        return;
      }

      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: item.quantity } }
        );
      }

      // Update order status
      order.status = 'cancelled';
      await order.save();

      sendSuccessResponse(res, { order }, 'Order cancelled successfully');
    } catch (error: any) {
      console.error('Cancel order error:', error);
      sendErrorResponse(res, 'Failed to cancel order', 500);
    }
  }

  async processPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const { orderId } = req.params;
      const { paymentId } = req.body;

      const order = await Order.findById(orderId);
      if (!order || order.user.toString() !== req.user.id) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      // Mock payment processing - in real implementation, integrate with Stripe/PayPal
      const paymentSuccess = Math.random() > 0.1; // 90% success rate for testing

      if (paymentSuccess) {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paymentId = paymentId || `mock_payment_${Date.now()}`;
        await order.save();

        sendSuccessResponse(res, { order }, 'Payment processed successfully');
      } else {
        order.paymentStatus = 'failed';
        await order.save();

        sendErrorResponse(res, 'Payment processing failed', 400);
      }
    } catch (error: any) {
      console.error('Process payment error:', error);
      sendErrorResponse(res, 'Failed to process payment', 500);
    }
  }

  async processCryptoPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const { orderId } = req.params;
      const { walletAddress, transactionHash, amount } = req.body;

      const order = await Order.findById(orderId);
      if (!order || order.user.toString() !== req.user.id) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      // Mock crypto payment verification - in real implementation, verify on blockchain
      const cryptoPaymentSuccess = Math.random() > 0.05; // 95% success rate for testing

      if (cryptoPaymentSuccess) {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paymentId = transactionHash || `crypto_payment_${Date.now()}`;
        order.cryptoPayment = {
          walletAddress,
          transactionHash,
          amount
        };
        await order.save();

        sendSuccessResponse(res, { order }, 'Crypto payment processed successfully');
      } else {
        order.paymentStatus = 'failed';
        await order.save();

        sendErrorResponse(res, 'Crypto payment verification failed', 400);
      }
    } catch (error: any) {
      console.error('Process crypto payment error:', error);
      sendErrorResponse(res, 'Crypto payment processing failed', 500);
    }
  }

  async getOrderTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findOne({ _id: orderId, user: userId })
        .select('orderNumber status trackingNumber createdAt updatedAt');

      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      sendSuccessResponse(res, { 
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        trackingNumber: order.trackingNumber,
        lastUpdated: order.updatedAt
      }, 'Order tracking retrieved successfully');
    } catch (error: any) {
      console.error('Get tracking error:', error);
      sendErrorResponse(res, 'Failed to get order tracking', 500);
    }
  }
}

export const orderController = new OrderController();