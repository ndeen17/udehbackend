import express from 'express';
import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserProductReview
} from '../controllers/reviewController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/products/:productId/reviews', getProductReviews);

// Protected routes (require authentication)
router.post('/products/:productId/reviews', authenticate, createReview);
router.get('/products/:productId/reviews/me', authenticate, getUserProductReview);
router.put('/reviews/:reviewId', authenticate, updateReview);
router.delete('/reviews/:reviewId', authenticate, deleteReview);
router.post('/reviews/:reviewId/helpful', authenticate, markReviewHelpful);

export default router;
