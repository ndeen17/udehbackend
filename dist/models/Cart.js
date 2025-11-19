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
exports.Cart = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cartItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    variant: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const cartSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
cartSchema.index({ 'items.product': 1 });
cartSchema.pre('save', function (next) {
    this.calculateTotals();
    next();
});
cartSchema.methods.addItem = async function (productId, quantity, variantId) {
    const existingItemIndex = this.items.findIndex((item) => {
        return item.product.toString() === productId.toString() &&
            (!variantId || (item.variant && item.variant.toString() === variantId.toString()));
    });
    if (existingItemIndex > -1) {
        this.items[existingItemIndex].quantity += quantity;
        this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].unitPrice * this.items[existingItemIndex].quantity;
    }
    else {
        const Product = mongoose_1.default.model('Product');
        const product = await Product.findById(productId);
        if (!product)
            throw new Error('Product not found');
        const unitPrice = product.price;
        this.items.push({
            product: productId,
            variant: variantId,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
            addedAt: new Date()
        });
    }
};
cartSchema.methods.removeItem = async function (productId, variantId) {
    this.items = this.items.filter((item) => {
        return !(item.product.toString() === productId.toString() &&
            (!variantId || (item.variant && item.variant.toString() === variantId.toString())));
    });
};
cartSchema.methods.updateQuantity = async function (productId, quantity, variantId) {
    const itemIndex = this.items.findIndex((item) => {
        return item.product.toString() === productId.toString() &&
            (!variantId || (item.variant && item.variant.toString() === variantId.toString()));
    });
    if (itemIndex > -1) {
        if (quantity <= 0) {
            this.items.splice(itemIndex, 1);
        }
        else {
            this.items[itemIndex].quantity = quantity;
            this.items[itemIndex].totalPrice = this.items[itemIndex].unitPrice * quantity;
        }
    }
};
cartSchema.methods.clear = async function () {
    this.items = [];
};
cartSchema.methods.calculateTotals = function () {
    this.itemCount = this.items.reduce((total, item) => {
        return total + item.quantity;
    }, 0);
    this.totalAmount = this.items.reduce((total, item) => {
        return total + item.totalPrice;
    }, 0);
};
exports.Cart = mongoose_1.default.model('Cart', cartSchema);
