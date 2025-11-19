import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  variant?: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: Date;
}

export interface ICart extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addItem(productId: mongoose.Types.ObjectId, quantity: number, variantId?: mongoose.Types.ObjectId): Promise<void>;
  removeItem(productId: mongoose.Types.ObjectId, variantId?: mongoose.Types.ObjectId): Promise<void>;
  updateQuantity(productId: mongoose.Types.ObjectId, quantity: number, variantId?: mongoose.Types.ObjectId): Promise<void>;
  clear(): Promise<void>;
  calculateTotals(): void;
}

const cartItemSchema = new Schema<ICartItem>({
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
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const cartSchema = new Schema<ICart>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total amount cannot be negative']
  },
  itemCount: {
    type: Number,
    default: 0,
    min: [0, 'Item count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// user index removed - already created by unique: true
cartSchema.index({ 'items.product': 1 });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

// Instance method to add item
cartSchema.methods.addItem = async function(
  productId: mongoose.Types.ObjectId, 
  quantity: number, 
  variantId?: mongoose.Types.ObjectId
): Promise<void> {
  const existingItemIndex = this.items.findIndex((item: ICartItem) => {
    return item.product.toString() === productId.toString() && 
           (!variantId || (item.variant && item.variant.toString() === variantId.toString()));
  });

  if (existingItemIndex > -1) {
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].unitPrice * this.items[existingItemIndex].quantity;
  } else {
    // Get product details to set unit price
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const unitPrice = product.price; // Add variant price adjustment if needed
    this.items.push({
      product: productId,
      variant: variantId,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      addedAt: new Date()
    } as ICartItem);
  }
};

// Instance method to remove item
cartSchema.methods.removeItem = async function(
  productId: mongoose.Types.ObjectId, 
  variantId?: mongoose.Types.ObjectId
): Promise<void> {
  this.items = this.items.filter((item: ICartItem) => {
    return !(item.product.toString() === productId.toString() && 
             (!variantId || (item.variant && item.variant.toString() === variantId.toString())));
  });
};

// Instance method to update quantity
cartSchema.methods.updateQuantity = async function(
  productId: mongoose.Types.ObjectId, 
  quantity: number, 
  variantId?: mongoose.Types.ObjectId
): Promise<void> {
  const itemIndex = this.items.findIndex((item: ICartItem) => {
    return item.product.toString() === productId.toString() && 
           (!variantId || (item.variant && item.variant.toString() === variantId.toString()));
  });

  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].totalPrice = this.items[itemIndex].unitPrice * quantity;
    }
  }
};

// Instance method to clear cart
cartSchema.methods.clear = async function(): Promise<void> {
  this.items = [];
};

// Instance method to calculate totals
cartSchema.methods.calculateTotals = function(): void {
  this.itemCount = this.items.reduce((total: number, item: ICartItem) => {
    return total + item.quantity;
  }, 0);

  this.totalAmount = this.items.reduce((total: number, item: ICartItem) => {
    return total + item.totalPrice;
  }, 0);
};

export const Cart = mongoose.model<ICart>('Cart', cartSchema);