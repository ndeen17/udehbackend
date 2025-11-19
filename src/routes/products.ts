import { Router } from 'express';
import { productController } from '../controllers/productController';
import { auth, optionalAuth } from '../middleware/auth';

const router = Router();

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get('/', productController.getAllProducts);

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', productController.searchProducts);

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', productController.getFeaturedProducts);

// @route   GET /api/products/:slug
// @desc    Get product by slug
// @access  Public
router.get('/:slug', optionalAuth, productController.getProductBySlug);

// @route   GET /api/products/:id/variants
// @desc    Get product variants
// @access  Public
router.get('/:id/variants', productController.getProductVariants);

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Public
router.get('/:id/reviews', productController.getProductReviews);

// @route   POST /api/products/:id/reviews
// @desc    Add product review
// @access  Private
router.post('/:id/reviews', auth, productController.addProductReview);

// @route   GET /api/products/:id/related
// @desc    Get related products
// @access  Public
router.get('/:id/related', productController.getRelatedProducts);

export default router;