"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProductReview = exports.markReviewHelpful = exports.deleteReview = exports.updateReview = exports.getProductReviews = exports.createReview = void 0;
const models_1 = require("../models");
const mongoose_1 = __importDefault(require("mongoose"));
const createReview = async (req, res) => {
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
        const product = await models_1.Product.findById(productId);
        if (!product) {
            res.status(404).json({
                success: false,
                message: 'Product not found'
            });
            return;
        }
        const existingReview = await models_1.Review.findOne({
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
        const hasPurchased = await models_1.Order.findOne({
            user: userId,
            'items.product': productId,
            paymentStatus: 'paid',
            status: { $in: ['processing', 'shipped', 'delivered'] }
        });
        const review = await models_1.Review.create({
            user: userId,
            product: productId,
            rating,
            title: title?.trim() || undefined,
            comment: comment.trim(),
            verifiedPurchase: !!hasPurchased,
            helpful: 0,
            helpfulBy: []
        });
        await review.populate('user', 'firstName lastName email');
        await product.updateReviewStats();
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    }
    catch (error) {
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
exports.createReview = createReview;
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { sort = 'newest', rating, page = '1', limit = '10', verified } = req.query;
        const product = await models_1.Product.findById(productId);
        if (!product) {
            res.status(404).json({
                success: false,
                message: 'Product not found'
            });
            return;
        }
        const filter = {
            product: productId,
            isApproved: true
        };
        if (rating) {
            filter.rating = parseInt(rating);
        }
        if (verified === 'true') {
            filter.verifiedPurchase = true;
        }
        let sortOption = { createdAt: -1 };
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
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [reviews, totalReviews] = await Promise.all([
            models_1.Review.find(filter)
                .populate('user', 'firstName lastName email')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            models_1.Review.countDocuments(filter)
        ]);
        const ratingDistribution = await models_1.Review.aggregate([
            {
                $match: {
                    product: new mongoose_1.default.Types.ObjectId(productId),
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
        const ratingCounts = {
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
    }
    catch (error) {
        console.error('Get product reviews error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch reviews'
        });
    }
};
exports.getProductReviews = getProductReviews;
const updateReview = async (req, res) => {
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
        const review = await models_1.Review.findById(reviewId);
        if (!review) {
            res.status(404).json({
                success: false,
                message: 'Review not found'
            });
            return;
        }
        if (review.user.toString() !== userId.toString()) {
            res.status(403).json({
                success: false,
                message: 'You can only edit your own reviews'
            });
            return;
        }
        review.rating = rating;
        review.title = title?.trim() || undefined;
        review.comment = comment.trim();
        await review.save();
        await review.populate('user', 'firstName lastName email');
        const product = await models_1.Product.findById(review.product);
        if (product) {
            await product.updateReviewStats();
        }
        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: review
        });
    }
    catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update review'
        });
    }
};
exports.updateReview = updateReview;
const deleteReview = async (req, res) => {
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
        const review = await models_1.Review.findById(reviewId);
        if (!review) {
            res.status(404).json({
                success: false,
                message: 'Review not found'
            });
            return;
        }
        if (review.user.toString() !== userId.toString() && userRole !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'You can only delete your own reviews'
            });
            return;
        }
        const productId = review.product;
        await review.deleteOne();
        const product = await models_1.Product.findById(productId);
        if (product) {
            await product.updateReviewStats();
        }
        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete review'
        });
    }
};
exports.deleteReview = deleteReview;
const markReviewHelpful = async (req, res) => {
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
        const review = await models_1.Review.findById(reviewId);
        if (!review) {
            res.status(404).json({
                success: false,
                message: 'Review not found'
            });
            return;
        }
        const hasMarked = review.helpfulBy.some(id => id.toString() === userId.toString());
        if (hasMarked) {
            review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId.toString());
            review.helpful = Math.max(0, review.helpful - 1);
        }
        else {
            review.helpfulBy.push(new mongoose_1.default.Types.ObjectId(userId));
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
    }
    catch (error) {
        console.error('Mark review helpful error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update helpful status'
        });
    }
};
exports.markReviewHelpful = markReviewHelpful;
const getUserProductReview = async (req, res) => {
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
        const review = await models_1.Review.findOne({
            user: userId,
            product: productId
        }).populate('user', 'firstName lastName email');
        const hasPurchased = await models_1.Order.findOne({
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
    }
    catch (error) {
        console.error('Get user product review error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch review'
        });
    }
};
exports.getUserProductReview = getUserProductReview;
