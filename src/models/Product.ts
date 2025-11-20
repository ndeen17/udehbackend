import mongoose, { Document, Schema } from 'mongoose';

export interface IProductImage {
  url: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface IProductVariant {
  _id?: mongoose.Types.ObjectId;
  variantType: string; // 'size', 'color', 'material'
  variantValue: string;
  priceAdjustment: number;
  stockQuantity: number;
  sku?: string;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  stockQuantity: number;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  images: IProductImage[];
  variants: IProductVariant[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isInStock(): boolean;
  getDiscountPercentage(): number;
  getPrimaryImage(): IProductImage | null;
  updateReviewStats(): Promise<void>;
}

const productImageSchema = new Schema<IProductImage>({
  url: {
    type: String,
    required: [true, 'Image URL is required']
  },
  altText: {
    type: String,
    trim: true,
    maxlength: [255, 'Alt text cannot exceed 255 characters']
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const productVariantSchema = new Schema<IProductVariant>({
  variantType: {
    type: String,
    required: [true, 'Variant type is required'],
    enum: ['size', 'color', 'material', 'style'],
    trim: true
  },
  variantValue: {
    type: String,
    required: [true, 'Variant value is required'],
    trim: true,
    maxlength: [100, 'Variant value cannot exceed 100 characters']
  },
  priceAdjustment: {
    type: Number,
    default: 0
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  sku: {
    type: String,
    trim: true,
    sparse: true,
    maxlength: [100, 'SKU cannot exceed 100 characters']
  }
}, { _id: true });

const productSchema = new Schema<IProduct>({
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [255, 'Product name cannot exceed 255 characters']
  },
  slug: {
    type: String,
    required: [true, 'Product slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: [100, 'SKU cannot exceed 100 characters']
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    },
    depth: {
      type: Number,
      min: [0, 'Depth cannot be negative']
    }
  },
  images: [productImageSchema],
  variants: [productVariantSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'SEO title cannot exceed 200 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'SEO description cannot exceed 500 characters']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Average rating cannot be negative'],
    max: [5, 'Average rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ category: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stockQuantity: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });

// Instance method to check if product is in stock
productSchema.methods.isInStock = function(): boolean {
  return this.stockQuantity > 0;
};

// Instance method to get discount percentage
productSchema.methods.getDiscountPercentage = function(): number {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
};

// Instance method to get primary image
productSchema.methods.getPrimaryImage = function(): IProductImage | null {
  const primaryImage = this.images.find((img: IProductImage) => img.isPrimary);
  return primaryImage || (this.images.length > 0 ? this.images[0] : null);
};

// Virtual for total stock (including variants)
productSchema.virtual('totalStock').get(function() {
  const variantStock = this.variants.reduce((total: number, variant: IProductVariant) => {
    return total + variant.stockQuantity;
  }, 0);
  return this.stockQuantity + variantStock;
});

// Instance method to update review statistics
productSchema.methods.updateReviewStats = async function(): Promise<void> {
  const Review = mongoose.model('Review');
  
  const stats = await Review.aggregate([
    {
      $match: {
        product: this._id,
        isApproved: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.averageRating = Math.round(stats[0].averageRating * 10) / 10; // Round to 1 decimal
    this.reviewCount = stats[0].reviewCount;
  } else {
    this.averageRating = 0;
    this.reviewCount = 0;
  }

  await this.save();
};

export const Product = mongoose.model<IProduct>('Product', productSchema);