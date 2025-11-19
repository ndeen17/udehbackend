import { Router } from 'express';
import { cartController } from '../controllers/cartControllerFixed';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', authenticate, cartController.getCart);

// @route   POST /api/cart/items
// @desc    Add item to cart
// @access  Private
router.post('/items', authenticate, cartController.validateAddToCart, cartController.addToCart);

// @route   PUT /api/cart/items/:productId
// @desc    Update cart item quantity
// @access  Private
router.put('/items/:productId', authenticate, cartController.validateUpdateCart, cartController.updateCartItem);

// @route   DELETE /api/cart/items/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/items/:productId', authenticate, cartController.removeFromCart);

// @route   DELETE /api/cart/clear
// @desc    Clear cart
// @access  Private
router.delete('/clear', authenticate, cartController.clearCart);

// @route   POST /api/cart/merge
// @desc    Merge guest cart with user cart on login
// @access  Private
router.post('/merge', authenticate, cartController.mergeCart);

export default router;