"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const reviewSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    comment: {
        type: String,
        required: [true, 'Comment is required'],
        trim: true,
        minlength: [10, 'Comment must be at least 10 characters'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    helpful: {
        type: Number,
        default: 0,
        min: [0, 'Helpful count cannot be negative']
    },
    helpfulBy: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    verifiedPurchase: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    moderationNote: {
        type: String,
        trim: true,
        maxlength: [500, 'Moderation note cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verifiedPurchase: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.pre('save', async function (next) {
    if (this.isNew) {
        const existingReview = await mongoose_1.default.model('Review').findOne({
            user: this.user,
            product: this.product,
            _id: { $ne: this._id }
        });
        if (existingReview) {
            const error = new Error('You have already reviewed this product');
            return next(error);
        }
    }
    next();
});
exports.Review = mongoose_1.default.model('Review', reviewSchema);
