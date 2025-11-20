import { Request, Response } from 'express';
import { Review, Product, Order } from '../models';
import mongoose from 'mongoose';

// Create a new review
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId
    });

    if (existingReview) {
      res.status(400).json({
        success: false,
        message: 'You have already reviewed this product. You can edit your existing review instead.'
      });
      return;
    }

    // Check if user has purchased this product (verified purchase)
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      paymentStatus: 'paid',
      status: { $in: ['processing', 'shipped', 'delivered'] }
    });

    // Create review
    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      title: title?.trim() || undefined,
      comment: comment.trim(),
      verifiedPurchase: !!hasPurchased,
      helpful: 0,
      helpfulBy: []
    });

    // Populate user details
    await review.populate('user', 'firstName lastName email');

    // Update product review stats
    await product.updateReviewStats();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error: any) {
    console.error('Create review error:', error);
    
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit review'
    });
  }
};

// Get all reviews for a product
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { 
      sort = 'newest', 
      rating, 
      page = '1', 
      limit = '10',
      verified 
    } = req.query;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Build filter
    const filter: any = {
      product: productId,
      isApproved: true
    };

    if (rating) {
      filter.rating = parseInt(rating as string);
    }

    if (verified === 'true') {
      filter.verifiedPurchase = true;
    }

    // Build sort
    let sortOption: any = { createdAt: -1 }; // Default: newest
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'rating-high':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpful: -1, createdAt: -1 };
        break;
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Fetch reviews
    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .populate('user', 'firstName lastName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter)
    ]);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          isApproved: true
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    // Format rating distribution
    const ratingCounts: { [key: number]: number } = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    ratingDistribution.forEach(item => {
      ratingCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalReviews / limitNum),
          totalReviews,
          limit: limitNum
        },
        summary: {
          averageRating: product.averageRating,
          totalReviews: product.reviewCount,
          ratingDistribution: ratingCounts
        }
      }
    });
  } catch (error: any) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reviews'
    });
  }
};

// Update a review
export const updateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found'
      });
      return;
    }

    // Check ownership
    if (review.user.toString() !== userId.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only edit your own reviews'
      });
      return;
    }

    // Update review
    review.rating = rating;
    review.title = title?.trim() || undefined;
    review.comment = comment.trim();
    await review.save();

    // Populate user details
    await review.populate('user', 'firstName lastName email');

    // Update product review stats
    const product = await Product.findById(review.product);
    if (product) {
      await product.updateReviewStats();
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error: any) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update review'
    });
  }
};

// Delete a review
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found'
      });
      return;
    }

    // Check ownership (user can delete own review, admin can delete any)
    if (review.user.toString() !== userId.toString() && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
      return;
    }

    const productId = review.product;

    // Delete review
    await review.deleteOne();

    // Update product review stats
    const product = await Product.findById(productId);
    if (product) {
      await product.updateReviewStats();
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete review'
    });
  }
};

// Mark review as helpful
export const markReviewHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found'
      });
      return;
    }

    // Check if user already marked as helpful
    const hasMarked = review.helpfulBy.some(
      id => id.toString() === userId.toString()
    );

    if (hasMarked) {
      // Remove from helpful
      review.helpfulBy = review.helpfulBy.filter(
        id => id.toString() !== userId.toString()
      );
      review.helpful = Math.max(0, review.helpful - 1);
    } else {
      // Add to helpful
      review.helpfulBy.push(new mongoose.Types.ObjectId(userId));
      review.helpful += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: hasMarked ? 'Removed from helpful' : 'Marked as helpful',
      data: {
        helpful: review.helpful,
        hasMarked: !hasMarked
      }
    });
  } catch (error: any) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update helpful status'
    });
  }
};

// Get user's review for a product (if exists)
export const getUserProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const review = await Review.findOne({
      user: userId,
      product: productId
    }).populate('user', 'firstName lastName email');

    // Check if user has purchased this product
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      paymentStatus: 'paid',
      status: { $in: ['processing', 'shipped', 'delivered'] }
    });

    res.status(200).json({
      success: true,
      data: {
        review: review || null,
        hasPurchased: !!hasPurchased
      }
    });
  } catch (error: any) {
    console.error('Get user product review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch review'
    });
  }
};
