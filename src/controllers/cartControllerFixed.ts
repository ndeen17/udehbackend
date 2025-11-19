import { Request, Response } from 'express';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';

class CartController {
  // Validation middleware
  validateAddToCart = [
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
      .isMongoId()
      .withMessage('Invalid product ID'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer')
  ];

  validateUpdateCart = [
    body('quantity')
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer')
  ];

  async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const userId = req.user.id;
      
      let cart = await Cart.findOne({ user: userId })
        .populate({
          path: 'items.product',
          select: 'name slug price stockQuantity images isActive'
        });

      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [],
          totalAmount: 0,
          itemCount: 0
        });
        await cart.save();
      }

      // Filter out inactive products
      const activeItems = cart.items.filter(item => {
        if (!item.product) return false;
        return (item.product as any).isActive;
      });

      if (activeItems.length !== cart.items.length) {
        cart.items = activeItems;
        cart.calculateTotals();
        await cart.save();
      }

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        }
      }, 'Cart retrieved successfully');
    } catch (error: any) {
      console.error('Get cart error:', error);
      sendErrorResponse(res, 'Failed to get cart', 500);
    }
  }

  async addToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const { productId, quantity } = req.body;

      // Verify product exists and is active
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        sendErrorResponse(res, 'Product not found or unavailable', 404);
        return;
      }

      // Check stock availability
      if (product.stockQuantity < quantity) {
        sendErrorResponse(res, `Insufficient stock. Available: ${product.stockQuantity}`, 400);
        return;
      }

      // Find or create cart
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [],
          totalAmount: 0,
          itemCount: 0
        });
      }

      // Check if product already exists in cart
      const existingItemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = 
          cart.items[existingItemIndex].unitPrice * cart.items[existingItemIndex].quantity;
      } else {
        // Add new item
        cart.items.push({
          product: new mongoose.Types.ObjectId(productId),
          quantity,
          unitPrice: product.price,
          totalPrice: product.price * quantity,
          addedAt: new Date()
        } as any);
      }

      cart.calculateTotals();
      await cart.save();

      // Populate and return updated cart
      await cart.populate({
        path: 'items.product',
        select: 'name slug price stockQuantity images isActive'
      });

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        }
      }, 'Item added to cart successfully');
    } catch (error: any) {
      console.error('Add to cart error:', error);
      sendErrorResponse(res, error.message || 'Failed to add item to cart', 500);
    }
  }

  async updateCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const { productId } = req.params;
      const { quantity } = req.body;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        sendErrorResponse(res, 'Cart not found', 404);
        return;
      }

      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId
      );

      if (itemIndex === -1) {
        sendErrorResponse(res, 'Item not found in cart', 404);
        return;
      }

      if (quantity === 0) {
        // Remove item
        cart.items.splice(itemIndex, 1);
      } else {
        // Verify stock
        const product = await Product.findById(productId);
        if (!product || product.stockQuantity < quantity) {
          sendErrorResponse(res, 'Insufficient stock', 400);
          return;
        }

        // Update quantity
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].unitPrice * quantity;
      }

      cart.calculateTotals();
      await cart.save();

      await cart.populate({
        path: 'items.product',
        select: 'name slug price stockQuantity images isActive'
      });

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        }
      }, 'Cart item updated successfully');
    } catch (error: any) {
      console.error('Update cart error:', error);
      sendErrorResponse(res, error.message || 'Failed to update cart item', 500);
    }
  }

  async removeFromCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const userId = req.user.id;
      const { productId } = req.params;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        sendErrorResponse(res, 'Cart not found', 404);
        return;
      }

      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId
      );

      if (itemIndex === -1) {
        sendErrorResponse(res, 'Item not found in cart', 404);
        return;
      }

      cart.items.splice(itemIndex, 1);
      cart.calculateTotals();
      await cart.save();

      await cart.populate({
        path: 'items.product',
        select: 'name slug price stockQuantity images isActive'
      });

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        }
      }, 'Item removed from cart successfully');
    } catch (error: any) {
      console.error('Remove from cart error:', error);
      sendErrorResponse(res, 'Failed to remove item from cart', 500);
    }
  }

  async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      const userId = req.user.id;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        sendErrorResponse(res, 'Cart not found', 404);
        return;
      }

      cart.items = [];
      cart.calculateTotals();
      await cart.save();

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        }
      }, 'Cart cleared successfully');
    } catch (error: any) {
      console.error('Clear cart error:', error);
      sendErrorResponse(res, 'Failed to clear cart', 500);
    }
  }

  async mergeCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendErrorResponse(res, 'Authentication required', 401);
        return;
      }

      // Basic implementation - can be expanded later for guest cart merging
      sendSuccessResponse(res, null, 'Cart merge functionality ready');
    } catch (error: any) {
      console.error('Merge cart error:', error);
      sendErrorResponse(res, 'Failed to merge cart', 500);
    }
  }
}

export const cartController = new CartController();