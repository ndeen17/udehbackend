import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconName?: string; // For Lucide React icons
  displayOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  iconName: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon name cannot exceed 50 characters']
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'SEO title cannot exceed 200 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'SEO description cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// slug index removed - already created by unique: true
categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ name: 'text', description: 'text' });

// Virtual for product count (to be populated)
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

export const Category = mongoose.model<ICategory>('Category', categorySchema);