"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartController = void 0;
const helpers_1 = require("../utils/helpers");
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const mongoose_1 = __importDefault(require("mongoose"));
const express_validator_1 = require("express-validator");
class CartController {
    constructor() {
        this.validateAddToCart = [
            (0, express_validator_1.body)('productId')
                .notEmpty()
                .withMessage('Product ID is required')
                .isMongoId()
                .withMessage('Invalid product ID'),
            (0, express_validator_1.body)('quantity')
                .isInt({ min: 1 })
                .withMessage('Quantity must be a positive integer')
        ];
        this.validateUpdateCart = [
            (0, express_validator_1.body)('quantity')
                .isInt({ min: 0 })
                .withMessage('Quantity must be a non-negative integer')
        ];
    }
    async getCart(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const userId = req.user.id;
            let cart = await Cart_1.Cart.findOne({ user: userId })
                .populate({
                path: 'items.product',
                select: 'name slug price stockQuantity images isActive'
            });
            if (!cart) {
                cart = new Cart_1.Cart({
                    user: userId,
                    items: [],
                    totalAmount: 0,
                    itemCount: 0
                });
                await cart.save();
            }
            const activeItems = cart.items.filter(item => {
                if (!item.product)
                    return false;
                return item.product.isActive;
            });
            if (activeItems.length !== cart.items.length) {
                cart.items = activeItems;
                cart.calculateTotals();
                await cart.save();
            }
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt
                }
            }, 'Cart retrieved successfully');
        }
        catch (error) {
            console.error('Get cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get cart', 500);
        }
    }
    async addToCart(req, res) {
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
            const { productId, quantity } = req.body;
            const product = await Product_1.Product.findById(productId);
            if (!product || !product.isActive) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found or unavailable', 404);
                return;
            }
            if (product.stockQuantity < quantity) {
                (0, helpers_1.sendErrorResponse)(res, `Insufficient stock. Available: ${product.stockQuantity}`, 400);
                return;
            }
            let cart = await Cart_1.Cart.findOne({ user: userId });
            if (!cart) {
                cart = new Cart_1.Cart({
                    user: userId,
                    items: [],
                    totalAmount: 0,
                    itemCount: 0
                });
            }
            const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += quantity;
                cart.items[existingItemIndex].totalPrice =
                    cart.items[existingItemIndex].unitPrice * cart.items[existingItemIndex].quantity;
            }
            else {
                cart.items.push({
                    product: new mongoose_1.default.Types.ObjectId(productId),
                    quantity,
                    unitPrice: product.price,
                    totalPrice: product.price * quantity,
                    addedAt: new Date()
                });
            }
            cart.calculateTotals();
            await cart.save();
            await cart.populate({
                path: 'items.product',
                select: 'name slug price stockQuantity images isActive'
            });
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt
                }
            }, 'Item added to cart successfully');
        }
        catch (error) {
            console.error('Add to cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, error.message || 'Failed to add item to cart', 500);
        }
    }
    async updateCartItem(req, res) {
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
            const { productId } = req.params;
            const { quantity } = req.body;
            const cart = await Cart_1.Cart.findOne({ user: userId });
            if (!cart) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart not found', 404);
                return;
            }
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
            if (itemIndex === -1) {
                (0, helpers_1.sendErrorResponse)(res, 'Item not found in cart', 404);
                return;
            }
            if (quantity === 0) {
                cart.items.splice(itemIndex, 1);
            }
            else {
                const product = await Product_1.Product.findById(productId);
                if (!product || product.stockQuantity < quantity) {
                    (0, helpers_1.sendErrorResponse)(res, 'Insufficient stock', 400);
                    return;
                }
                cart.items[itemIndex].quantity = quantity;
                cart.items[itemIndex].totalPrice = cart.items[itemIndex].unitPrice * quantity;
            }
            cart.calculateTotals();
            await cart.save();
            await cart.populate({
                path: 'items.product',
                select: 'name slug price stockQuantity images isActive'
            });
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt
                }
            }, 'Cart item updated successfully');
        }
        catch (error) {
            console.error('Update cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, error.message || 'Failed to update cart item', 500);
        }
    }
    async removeFromCart(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const userId = req.user.id;
            const { productId } = req.params;
            const cart = await Cart_1.Cart.findOne({ user: userId });
            if (!cart) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart not found', 404);
                return;
            }
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
            if (itemIndex === -1) {
                (0, helpers_1.sendErrorResponse)(res, 'Item not found in cart', 404);
                return;
            }
            cart.items.splice(itemIndex, 1);
            cart.calculateTotals();
            await cart.save();
            await cart.populate({
                path: 'items.product',
                select: 'name slug price stockQuantity images isActive'
            });
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt
                }
            }, 'Item removed from cart successfully');
        }
        catch (error) {
            console.error('Remove from cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to remove item from cart', 500);
        }
    }
    async clearCart(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            const userId = req.user.id;
            const cart = await Cart_1.Cart.findOne({ user: userId });
            if (!cart) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart not found', 404);
                return;
            }
            cart.items = [];
            cart.calculateTotals();
            await cart.save();
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt
                }
            }, 'Cart cleared successfully');
        }
        catch (error) {
            console.error('Clear cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to clear cart', 500);
        }
    }
    async mergeCart(req, res) {
        try {
            if (!req.user) {
                (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, null, 'Cart merge functionality ready');
        }
        catch (error) {
            console.error('Merge cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to merge cart', 500);
        }
    }
}
exports.cartController = new CartController();
