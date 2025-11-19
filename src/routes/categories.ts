import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';

const router = Router();

// @route   GET /api/categories
// @desc    Get all active categories
// @access  Public
router.get('/', categoryController.getAllCategories);

// @route   GET /api/categories/:slug
// @desc    Get category by slug
// @access  Public
router.get('/:slug', categoryController.getCategoryBySlug);

// @route   GET /api/categories/:slug/products
// @desc    Get products by category
// @access  Public
router.get('/:slug/products', categoryController.getProductsByCategory);

export default router;