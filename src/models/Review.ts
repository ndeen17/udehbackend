import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  helpful: number;
  helpfulBy: mongoose.Types.ObjectId[];
  verifiedPurchase: boolean;
  isApproved: boolean;
  moderationNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  product: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true // Auto-approve by default, can be changed for moderation
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

// Indexes
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verifiedPurchase: 1 });
reviewSchema.index({ isApproved: 1 });

// Compound indexes
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true }); // One review per user per product

// Prevent duplicate reviews from same user for same product
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingReview = await mongoose.model<IReview>('Review').findOne({
      user: this.user,
      product: this.product,
      _id: { $ne: this._id }
    });

    if (existingReview) {
      const error = new Error('You have already reviewed this product');
      return next(error as any);
    }
  }
  next();
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);
