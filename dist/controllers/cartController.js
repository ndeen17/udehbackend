"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartController = void 0;
const helpers_1 = require("../utils/helpers");
const Cart_1 = require("../models/Cart");
const GuestCart_1 = require("../models/GuestCart");
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
                .withMessage('Quantity must be a positive integer'),
            (0, express_validator_1.body)('variantId')
                .optional()
                .isMongoId()
                .withMessage('Invalid variant ID')
        ];
        this.validateUpdateCart = [
            (0, express_validator_1.body)('quantity')
                .isInt({ min: 0 })
                .withMessage('Quantity must be a non-negative integer')
        ];
    }
    async getCart(req, res) {
        try {
            let cart = null;
            if (req.user) {
                const userId = req.user.id;
                cart = await Cart_1.Cart.findOne({ user: userId })
                    .populate({
                    path: 'items.product',
                    select: 'name slug price stockQuantity images isActive',
                    populate: {
                        path: 'category',
                        select: 'name slug'
                    }
                })
                    .populate('items.variant');
                if (!cart) {
                    cart = new Cart_1.Cart({
                        user: userId,
                        items: [],
                        totalAmount: 0,
                        itemCount: 0
                    });
                    await cart.save();
                }
            }
            else {
                const guestId = req.guestId;
                if (!guestId) {
                    (0, helpers_1.sendErrorResponse)(res, 'Guest ID required', 400);
                    return;
                }
                cart = await GuestCart_1.GuestCart.findOne({ guestId })
                    .populate({
                    path: 'items.product',
                    select: 'name slug price stockQuantity images isActive',
                    populate: {
                        path: 'category',
                        select: 'name slug'
                    }
                })
                    .populate('items.variant');
                if (!cart) {
                    cart = new GuestCart_1.GuestCart({
                        guestId,
                        items: [],
                        totalAmount: 0,
                        itemCount: 0
                    });
                    await cart.save();
                }
            }
            cart.items = cart.items.filter(item => item.product && item.product.isActive);
            cart.calculateTotals();
            await cart.save();
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt,
                    guestId: req.user ? undefined : req.guestId
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
            const { productId, quantity, variantId } = req.body;
            const product = await Product_1.Product.findById(productId);
            if (!product || !product.isActive) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found or unavailable', 404);
                return;
            }
            let availableStock = product.stockQuantity;
            if (variantId) {
                const variant = product.variants.find(v => v._id?.toString() === variantId);
                if (!variant) {
                    (0, helpers_1.sendErrorResponse)(res, 'Product variant not found', 404);
                    return;
                }
                availableStock = variant.stockQuantity;
            }
            if (availableStock < quantity) {
                (0, helpers_1.sendErrorResponse)(res, `Insufficient stock. Available: ${availableStock}`, 400);
                return;
            }
            let cart;
            if (req.user) {
                const userId = req.user.id;
                let userCart = await Cart_1.Cart.findOne({ user: userId });
                if (!userCart) {
                    userCart = new Cart_1.Cart({
                        user: userId,
                        items: [],
                        totalAmount: 0,
                        itemCount: 0
                    });
                }
                cart = userCart;
            }
            else {
                const guestId = req.guestId;
                if (!guestId) {
                    (0, helpers_1.sendErrorResponse)(res, 'Guest ID required', 400);
                    return;
                }
                let guestCart = await GuestCart_1.GuestCart.findOne({ guestId });
                if (!guestCart) {
                    guestCart = new GuestCart_1.GuestCart({
                        guestId,
                        items: [],
                        totalAmount: 0,
                        itemCount: 0
                    });
                }
                cart = guestCart;
            }
            await cart.addItem(new mongoose_1.default.Types.ObjectId(productId), quantity, variantId ? new mongoose_1.default.Types.ObjectId(variantId) : undefined);
            await cart.save();
            await cart.populate([
                {
                    path: 'items.product',
                    select: 'name slug price stockQuantity images isActive',
                    populate: {
                        path: 'category',
                        select: 'name slug'
                    }
                }
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt,
                    guestId: req.user ? undefined : req.guestId
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
            const { productId } = req.params;
            const { quantity, variantId } = req.body;
            let cart = null;
            if (req.user) {
                cart = await Cart_1.Cart.findOne({ user: req.user.id });
            }
            else {
                const guestId = req.guestId;
                if (!guestId) {
                    (0, helpers_1.sendErrorResponse)(res, 'Guest ID required', 400);
                    return;
                }
                cart = await GuestCart_1.GuestCart.findOne({ guestId });
            }
            if (!cart) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart not found', 404);
                return;
            }
            const itemExists = cart.items.some(item => item.product.toString() === productId &&
                (!variantId || (item.variant && item.variant.toString() === variantId)));
            if (!itemExists) {
                (0, helpers_1.sendErrorResponse)(res, 'Item not found in cart', 404);
                return;
            }
            if (quantity === 0) {
                await cart.removeItem(new mongoose_1.default.Types.ObjectId(productId), variantId ? new mongoose_1.default.Types.ObjectId(variantId) : undefined);
            }
            else {
                const product = await Product_1.Product.findById(productId);
                if (!product || !product.isActive) {
                    (0, helpers_1.sendErrorResponse)(res, 'Product not found or unavailable', 404);
                    return;
                }
                let availableStock = product.stockQuantity;
                if (variantId) {
                    const variant = product.variants.find(v => v._id?.toString() === variantId);
                    if (!variant) {
                        (0, helpers_1.sendErrorResponse)(res, 'Product variant not found', 404);
                        return;
                    }
                    availableStock = variant.stockQuantity;
                }
                if (availableStock < quantity) {
                    (0, helpers_1.sendErrorResponse)(res, `Insufficient stock. Available: ${availableStock}`, 400);
                    return;
                }
                await cart.updateQuantity(new mongoose_1.default.Types.ObjectId(productId), quantity, variantId ? new mongoose_1.default.Types.ObjectId(variantId) : undefined);
            }
            await cart.save();
            await cart.populate([
                {
                    path: 'items.product',
                    select: 'name slug price stockQuantity images isActive',
                    populate: {
                        path: 'category',
                        select: 'name slug'
                    }
                }
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt,
                    guestId: req.user ? undefined : req.guestId
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
            const { productId } = req.params;
            const { variantId } = req.query;
            let cart = null;
            if (req.user) {
                cart = await Cart_1.Cart.findOne({ user: req.user.id });
            }
            else {
                const guestId = req.guestId;
                if (!guestId) {
                    (0, helpers_1.sendErrorResponse)(res, 'Guest ID required', 400);
                    return;
                }
                cart = await GuestCart_1.GuestCart.findOne({ guestId });
            }
            if (!cart) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart not found', 404);
                return;
            }
            const itemExists = cart.items.some(item => item.product.toString() === productId &&
                (!variantId || (item.variant && item.variant.toString() === variantId)));
            if (!itemExists) {
                (0, helpers_1.sendErrorResponse)(res, 'Item not found in cart', 404);
                return;
            }
            await cart.removeItem(new mongoose_1.default.Types.ObjectId(productId), variantId ? new mongoose_1.default.Types.ObjectId(variantId) : undefined);
            await cart.save();
            await cart.populate([
                {
                    path: 'items.product',
                    select: 'name slug price stockQuantity images isActive',
                    populate: {
                        path: 'category',
                        select: 'name slug'
                    }
                }
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt,
                    guestId: req.user ? undefined : req.guestId
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
            let cart = null;
            if (req.user) {
                cart = await Cart_1.Cart.findOne({ user: req.user.id });
            }
            else {
                const guestId = req.guestId;
                if (!guestId) {
                    (0, helpers_1.sendErrorResponse)(res, 'Guest ID required', 400);
                    return;
                }
                cart = await GuestCart_1.GuestCart.findOne({ guestId });
            }
            if (!cart) {
                (0, helpers_1.sendErrorResponse)(res, 'Cart not found', 404);
                return;
            }
            await cart.clear();
            await cart.save();
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt,
                    guestId: req.user ? undefined : req.guestId
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
            const userId = req.user.id;
            const { guestCartItems } = req.body;
            if (!guestCartItems || !Array.isArray(guestCartItems)) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid guest cart items', 400);
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
            for (const guestItem of guestCartItems) {
                const { productId, quantity, variantId } = guestItem;
                const product = await Product_1.Product.findById(productId);
                if (!product || !product.isActive)
                    continue;
                let availableStock = product.stockQuantity;
                if (variantId) {
                    const variant = product.variants.find(v => v._id?.toString() === variantId);
                    if (!variant)
                        continue;
                    availableStock = variant.stockQuantity;
                }
                if (availableStock < quantity)
                    continue;
                await cart.addItem(new mongoose_1.default.Types.ObjectId(productId), quantity, variantId ? new mongoose_1.default.Types.ObjectId(variantId) : undefined);
            }
            await cart.save();
            await cart.populate([
                {
                    path: 'items.product',
                    select: 'name slug price stockQuantity images isActive',
                    populate: {
                        path: 'category',
                        select: 'name slug'
                    }
                }
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                cart: {
                    _id: cart._id,
                    items: cart.items,
                    totalAmount: cart.totalAmount,
                    itemCount: cart.itemCount,
                    updatedAt: cart.updatedAt
                }
            }, 'Cart merged successfully');
        }
        catch (error) {
            console.error('Merge cart error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to merge cart', 500);
        }
    }
}
exports.cartController = new CartController();
