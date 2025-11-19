import { Request, Response } from 'express';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';
import { Cart, ICart } from '../models/Cart';
import { GuestCart, IGuestCart } from '../models/GuestCart';
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
      .withMessage('Quantity must be a positive integer'),
    body('variantId')
      .optional()
      .isMongoId()
      .withMessage('Invalid variant ID')
  ];

  validateUpdateCart = [
    body('quantity')
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer')
  ];

  async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let cart: ICart | IGuestCart | null = null;
      
      if (req.user) {
        // Authenticated user - get user cart
        const userId = req.user.id;
        cart = await Cart.findOne({ user: userId })
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
          cart = new Cart({
            user: userId,
            items: [],
            totalAmount: 0,
            itemCount: 0
          });
          await cart.save();
        }
      } else {
        // Guest user - get guest cart
        const guestId = req.guestId;
        if (!guestId) {
          sendErrorResponse(res, 'Guest ID required', 400);
          return;
        }

        cart = await GuestCart.findOne({ guestId })
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
          cart = new GuestCart({
            guestId,
            items: [],
            totalAmount: 0,
            itemCount: 0
          });
          await cart.save();
        }
      }

      // Filter out inactive products
      cart.items = cart.items.filter(item => item.product && (item.product as any).isActive);
      
      // Recalculate totals after filtering
      cart.calculateTotals();
      await cart.save();

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt,
          guestId: req.user ? undefined : req.guestId
        }
      }, 'Cart retrieved successfully');
    } catch (error: any) {
      console.error('Get cart error:', error);
      sendErrorResponse(res, 'Failed to get cart', 500);
    }
  }

  async addToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendErrorResponse(res, 'Validation failed', 400, errors.array());
        return;
      }

      const { productId, quantity, variantId } = req.body;

      // Verify product exists and is active
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        sendErrorResponse(res, 'Product not found or unavailable', 404);
        return;
      }

      // Check stock availability
      let availableStock = product.stockQuantity;
      if (variantId) {
        const variant = product.variants.find(v => v._id?.toString() === variantId);
        if (!variant) {
          sendErrorResponse(res, 'Product variant not found', 404);
          return;
        }
        availableStock = variant.stockQuantity;
      }

      if (availableStock < quantity) {
        sendErrorResponse(res, `Insufficient stock. Available: ${availableStock}`, 400);
        return;
      }

      let cart: ICart | IGuestCart;

      if (req.user) {
        // Authenticated user
        const userId = req.user.id;
        let userCart = await Cart.findOne({ user: userId });
        if (!userCart) {
          userCart = new Cart({
            user: userId,
            items: [],
            totalAmount: 0,
            itemCount: 0
          });
        }
        cart = userCart;
      } else {
        // Guest user
        const guestId = req.guestId;
        if (!guestId) {
          sendErrorResponse(res, 'Guest ID required', 400);
          return;
        }

        let guestCart = await GuestCart.findOne({ guestId });
        if (!guestCart) {
          guestCart = new GuestCart({
            guestId,
            items: [],
            totalAmount: 0,
            itemCount: 0
          });
        }
        cart = guestCart;
      }

      // Add item to cart
      await cart.addItem(new mongoose.Types.ObjectId(productId), quantity, variantId ? new mongoose.Types.ObjectId(variantId) : undefined);
      await cart.save();

      // Populate and return updated cart
      await (cart as any).populate([
        {
          path: 'items.product',
          select: 'name slug price stockQuantity images isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        }
      ]);

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt,
          guestId: req.user ? undefined : req.guestId
        }
      }, 'Item added to cart successfully');
    } catch (error: any) {
      console.error('Add to cart error:', error);
      sendErrorResponse(res, error.message || 'Failed to add item to cart', 500);
    }
  }

  async updateCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendErrorResponse(res, 'Validation failed', 400, errors.array());
        return;
      }

      const { productId } = req.params;
      const { quantity, variantId } = req.body;

      let cart: ICart | IGuestCart | null = null;

      if (req.user) {
        // Authenticated user
        cart = await Cart.findOne({ user: req.user.id });
      } else {
        // Guest user
        const guestId = req.guestId;
        if (!guestId) {
          sendErrorResponse(res, 'Guest ID required', 400);
          return;
        }
        cart = await GuestCart.findOne({ guestId });
      }

      if (!cart) {
        sendErrorResponse(res, 'Cart not found', 404);
        return;
      }

      // Check if item exists in cart
      const itemExists = cart.items.some(item => 
        item.product.toString() === productId && 
        (!variantId || (item.variant && item.variant.toString() === variantId))
      );

      if (!itemExists) {
        sendErrorResponse(res, 'Item not found in cart', 404);
        return;
      }

      if (quantity === 0) {
        // Remove item if quantity is 0
        await cart.removeItem(new mongoose.Types.ObjectId(productId), variantId ? new mongoose.Types.ObjectId(variantId) : undefined);
      } else {
        // Verify product stock before updating
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
          sendErrorResponse(res, 'Product not found or unavailable', 404);
          return;
        }

        let availableStock = product.stockQuantity;
        if (variantId) {
          const variant = product.variants.find(v => v._id?.toString() === variantId);
          if (!variant) {
            sendErrorResponse(res, 'Product variant not found', 404);
            return;
          }
          availableStock = variant.stockQuantity;
        }

        if (availableStock < quantity) {
          sendErrorResponse(res, `Insufficient stock. Available: ${availableStock}`, 400);
          return;
        }

        // Update quantity
        await cart.updateQuantity(new mongoose.Types.ObjectId(productId), quantity, variantId ? new mongoose.Types.ObjectId(variantId) : undefined);
      }

      await cart.save();

      // Populate and return updated cart
      await (cart as any).populate([
        {
          path: 'items.product',
          select: 'name slug price stockQuantity images isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        }
      ]);

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt,
          guestId: req.user ? undefined : req.guestId
        }
      }, 'Cart item updated successfully');
    } catch (error: any) {
      console.error('Update cart error:', error);
      sendErrorResponse(res, error.message || 'Failed to update cart item', 500);
    }
  }

  async removeFromCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { variantId } = req.query;

      let cart: ICart | IGuestCart | null = null;

      if (req.user) {
        // Authenticated user
        cart = await Cart.findOne({ user: req.user.id });
      } else {
        // Guest user
        const guestId = req.guestId;
        if (!guestId) {
          sendErrorResponse(res, 'Guest ID required', 400);
          return;
        }
        cart = await GuestCart.findOne({ guestId });
      }

      if (!cart) {
        sendErrorResponse(res, 'Cart not found', 404);
        return;
      }

      // Check if item exists in cart
      const itemExists = cart.items.some(item => 
        item.product.toString() === productId && 
        (!variantId || (item.variant && item.variant.toString() === variantId))
      );

      if (!itemExists) {
        sendErrorResponse(res, 'Item not found in cart', 404);
        return;
      }

      await cart.removeItem(
        new mongoose.Types.ObjectId(productId), 
        variantId ? new mongoose.Types.ObjectId(variantId as string) : undefined
      );
      await cart.save();

      // Populate and return updated cart
      await (cart as any).populate([
        {
          path: 'items.product',
          select: 'name slug price stockQuantity images isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        }
      ]);

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt,
          guestId: req.user ? undefined : req.guestId
        }
      }, 'Item removed from cart successfully');
    } catch (error: any) {
      console.error('Remove from cart error:', error);
      sendErrorResponse(res, 'Failed to remove item from cart', 500);
    }
  }

  async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let cart: ICart | IGuestCart | null = null;

      if (req.user) {
        // Authenticated user
        cart = await Cart.findOne({ user: req.user.id });
      } else {
        // Guest user
        const guestId = req.guestId;
        if (!guestId) {
          sendErrorResponse(res, 'Guest ID required', 400);
          return;
        }
        cart = await GuestCart.findOne({ guestId });
      }

      if (!cart) {
        sendErrorResponse(res, 'Cart not found', 404);
        return;
      }

      await cart.clear();
      await cart.save();

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt,
          guestId: req.user ? undefined : req.guestId
        }
      }, 'Cart cleared successfully');
    } catch (error: any) {
      console.error('Clear cart error:', error);
      sendErrorResponse(res, 'Failed to clear cart', 500);
    }
  }

  async mergeCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { guestCartItems } = req.body;

      if (!guestCartItems || !Array.isArray(guestCartItems)) {
        sendErrorResponse(res, 'Invalid guest cart items', 400);
      }

      // Find or create user cart
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [],
          totalAmount: 0,
          itemCount: 0
        });
      }

      // Merge guest cart items
      for (const guestItem of guestCartItems) {
        const { productId, quantity, variantId } = guestItem;
        
        // Verify product exists and is active
        const product = await Product.findById(productId);
        if (!product || !product.isActive) continue;

        // Check stock availability
        let availableStock = product.stockQuantity;
        if (variantId) {
          const variant = product.variants.find(v => v._id?.toString() === variantId);
          if (!variant) continue;
          availableStock = variant.stockQuantity;
        }

        if (availableStock < quantity) continue;

        // Add/merge item
        await cart.addItem(
          new mongoose.Types.ObjectId(productId), 
          quantity, 
          variantId ? new mongoose.Types.ObjectId(variantId) : undefined
        );
      }

      await cart.save();

      // Populate and return merged cart
      await (cart as any).populate([
        {
          path: 'items.product',
          select: 'name slug price stockQuantity images isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        }
      ]);

      sendSuccessResponse(res, {
        cart: {
          _id: cart._id,
          items: cart.items,
          totalAmount: cart.totalAmount,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        }
      }, 'Cart merged successfully');
    } catch (error: any) {
      console.error('Merge cart error:', error);
      sendErrorResponse(res, 'Failed to merge cart', 500);
    }
  }
}

export const cartController = new CartController();
