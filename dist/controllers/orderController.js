"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = void 0;
const helpers_1 = require("../utils/helpers");
const Order_1 = require("../models/Order");
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const emailService_1 = require("../services/emailService");
const express_validator_1 = require("express-validator");
class OrderController {
    constructor() {
        this.validateCreateOrder = [
            (0, express_validator_1.body)('shippingAddress.firstName')
                .notEmpty()
                .withMessage('First name is required'),
            (0, express_validator_1.body)('shippingAddress.lastName')
                .notEmpty()
                .withMessage('Last name is required'),
            (0, express_validator_1.body)('shippingAddress.addressLine1')
                .notEmpty()
                .withMessage('Address line 1 is required'),
            (0, express_validator_1.body)('shippingAddress.city')
                .notEmpty()
                .withMessage('City is required'),
            (0, express_validator_1.body)('shippingAddress.postalCode')
                .notEmpty()
                .withMessage('Postal code is required'),
            (0, express_validator_1.body)('shippingAddress.country')
                .notEmpty()
                .withMessage('Country is required'),
            (0, express_validator_1.body)('paymentMethod')
                .notEmpty()
                .withMessage('Payment method is required')
        ];
    }
    async createOrder(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                (0, helpers_1.sendErrorResponse)(res, 'Validation failed', 400, errors.array());
                return;
            }
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const userId = req.user.id;
            const { shippingAddress, paymentMethod, notes } = req.body;
            const cart = await Cart_1.Cart.findOne({ user: userId }).populate('items.product');
            if (!cart || cart.items.length === 0) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart is empty', 400);
                return;
            }
            for (const item of cart.items) {
                const product = await Product_1.Product.findById(item.product);
                if (!product || !product.isActive) {
                    (0, helpers_1.sendErrorResponse)(res, `Product ${item.product} is no longer available`, 400);
                    return;
                }
                if (product.stockQuantity < item.quantity) {
                    (0, helpers_1.sendErrorResponse)(res, `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`, 400);
                    return;
                }
            }
            const subtotal = cart.totalAmount;
            const shippingCost = subtotal >= 100 ? 0 : 10;
            const tax = subtotal * 0.08;
            const total = subtotal + shippingCost + tax;
            const orderNumber = Order_1.Order.generateOrderNumber();
            const orderItems = cart.items.map(item => {
                const product = item.product;
                return {
                    product: item.product,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    productSnapshot: {
                        name: product.name,
                        slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        description: product.description || '',
                        images: product.images?.map((img) => img.url) || [],
                        category: product.category?.name || 'Uncategorized'
                    }
                };
            });
            const order = new Order_1.Order({
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
            for (const item of cart.items) {
                await Product_1.Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
            }
            cart.items = [];
            cart.calculateTotals();
            await cart.save();
            try {
                await emailService_1.emailService.sendOrderConfirmationEmail(req.user.email, req.user.name, orderNumber, total);
            }
            catch (emailError) {
                console.error('Failed to send order confirmation email:', emailError);
            }
            (0, helpers_1.sendSuccessResponse)(res, {
                order: {
                    _id: order._id,
                    orderNumber: order.orderNumber,
                    total: order.totalAmount,
                    orderStatus: order.status,
                    paymentStatus: order.paymentStatus,
                    createdAt: order.createdAt
                }
            }, 'Order created successfully');
        }
        catch (error) {
            console.error('Create order error:', error);
            (0, helpers_1.sendErrorResponse)(res, error.message || 'Failed to create order', 500);
        }
    }
    async getUserOrders(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const orders = await Order_1.Order.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('orderNumber totalAmount status paymentStatus createdAt items');
            const totalOrders = await Order_1.Order.countDocuments({ user: userId });
            (0, helpers_1.sendSuccessResponse)(res, {
                orders,
                pagination: {
                    page,
                    limit,
                    total: totalOrders,
                    pages: Math.ceil(totalOrders / limit)
                }
            }, 'Orders retrieved successfully');
        }
        catch (error) {
            console.error('Get orders error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get orders', 500);
        }
    }
    async getOrderById(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const { orderId } = req.params;
            const userId = req.user.id;
            const order = await Order_1.Order.findOne({ _id: orderId, user: userId })
                .populate('items.product', 'name slug images');
            if (!order) {
                (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, { order }, 'Order retrieved successfully');
        }
        catch (error) {
            console.error('Get order error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get order', 500);
        }
    }
    async cancelOrder(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const { orderId } = req.params;
            const userId = req.user.id;
            const order = await Order_1.Order.findOne({ _id: orderId, user: userId });
            if (!order) {
                (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
                return;
            }
            if (!['pending', 'processing'].includes(order.status)) {
                (0, helpers_1.sendErrorResponse)(res, 'Order cannot be cancelled', 400);
                return;
            }
            for (const item of order.items) {
                await Product_1.Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } });
            }
            order.status = 'cancelled';
            await order.save();
            (0, helpers_1.sendSuccessResponse)(res, { order }, 'Order cancelled successfully');
        }
        catch (error) {
            console.error('Cancel order error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to cancel order', 500);
        }
    }
    async processPayment(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const { orderId } = req.params;
            const { paymentId } = req.body;
            const order = await Order_1.Order.findById(orderId);
            if (!order || order.user.toString() !== req.user.id) {
                (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
                return;
            }
            const paymentSuccess = Math.random() > 0.1;
            if (paymentSuccess) {
                order.paymentStatus = 'paid';
                order.status = 'processing';
                order.paymentId = paymentId || `mock_payment_${Date.now()}`;
                await order.save();
                (0, helpers_1.sendSuccessResponse)(res, { order }, 'Payment processed successfully');
            }
            else {
                order.paymentStatus = 'failed';
                await order.save();
                (0, helpers_1.sendErrorResponse)(res, 'Payment processing failed', 400);
            }
        }
        catch (error) {
            console.error('Process payment error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to process payment', 500);
        }
    }
    async processCryptoPayment(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const { orderId } = req.params;
            const { walletAddress, transactionHash, amount } = req.body;
            const order = await Order_1.Order.findById(orderId);
            if (!order || order.user.toString() !== req.user.id) {
                (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
                return;
            }
            const cryptoPaymentSuccess = Math.random() > 0.05;
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
                (0, helpers_1.sendSuccessResponse)(res, { order }, 'Crypto payment processed successfully');
            }
            else {
                order.paymentStatus = 'failed';
                await order.save();
                (0, helpers_1.sendErrorResponse)(res, 'Crypto payment verification failed', 400);
            }
        }
        catch (error) {
            console.error('Process crypto payment error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Crypto payment processing failed', 500);
        }
    }
    async getOrderTracking(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const { orderId } = req.params;
            const userId = req.user.id;
            const order = await Order_1.Order.findOne({ _id: orderId, user: userId })
                .select('orderNumber status trackingNumber createdAt updatedAt');
            if (!order) {
                (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, {
                orderNumber: order.orderNumber,
                orderStatus: order.status,
                trackingNumber: order.trackingNumber,
                lastUpdated: order.updatedAt
            }, 'Order tracking retrieved successfully');
        }
        catch (error) {
            console.error('Get tracking error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get order tracking', 500);
        }
    }
}
exports.orderController = new OrderController();
