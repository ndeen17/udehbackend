import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  variant?: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productSnapshot: {
    name: string;
    slug: string;
    description?: string;
    images: string[];
    category: string;
  };
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: IOrderItem[];
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentId?: string;
  shippingAddress: IAddress;
  billingAddress?: IAddress;
  trackingNumber?: string;
  notes?: string;
  cryptoPayment?: {
    walletAddress: string;
    transactionHash: string;
    amount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateOrderNumber(): string;
  calculateTotals(): void;
}

const addressSchema = new Schema<IAddress>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  addressLine1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true,
    maxlength: [255, 'Address line 1 cannot exceed 255 characters']
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: [255, 'Address line 2 cannot exceed 255 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  }
}, { _id: false });

const orderItemSchema = new Schema<IOrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  variant: {
    type: Schema.Types.ObjectId,
    ref: 'ProductVariant'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  productSnapshot: {
    name: {
      type: String,
      required: true
    },
    slug: {
      type: String,
      required: true
    },
    description: String,
    images: [String],
    category: {
      type: String,
      required: true
    }
  }
}, { _id: true });

const orderSchema = new Schema<IOrder>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: function(items: IOrderItem[]) {
        return items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  shippingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Shipping amount cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    trim: true
  },
  paymentId: {
    type: String,
    trim: true
  },
  shippingAddress: {
    type: addressSchema,
    required: [true, 'Shipping address is required']
  },
  billingAddress: addressSchema,
  trackingNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  cryptoPayment: {
    walletAddress: String,
    transactionHash: String,
    amount: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ user: 1 });
// orderNumber index removed - already created by unique: true
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Compound indexes
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ user: 1, createdAt: -1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.generateOrderNumber();
  }
  next();
});

// Instance method to generate order number
orderSchema.methods.generateOrderNumber = function(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `UG${timestamp.slice(-8)}${random}`;
};

// Instance method to calculate totals
orderSchema.methods.calculateTotals = function(): void {
  this.subtotal = this.items.reduce((total: number, item: IOrderItem) => {
    return total + item.totalPrice;
  }, 0);
  
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingAmount - this.discountAmount;
};

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total: number, item: IOrderItem) => {
    return total + item.quantity;
  }, 0);
});

export const Order = mongoose.model<IOrder>('Order', orderSchema);