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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const productImageSchema = new mongoose_1.Schema({
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
const productVariantSchema = new mongoose_1.Schema({
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
const productSchema = new mongoose_1.Schema({
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
productSchema.index({ category: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stockQuantity: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.methods.isInStock = function () {
    return this.stockQuantity > 0;
};
productSchema.methods.getDiscountPercentage = function () {
    if (!this.comparePrice || this.comparePrice <= this.price)
        return 0;
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
};
productSchema.methods.getPrimaryImage = function () {
    const primaryImage = this.images.find((img) => img.isPrimary);
    return primaryImage || (this.images.length > 0 ? this.images[0] : null);
};
productSchema.virtual('totalStock').get(function () {
    const variantStock = this.variants.reduce((total, variant) => {
        return total + variant.stockQuantity;
    }, 0);
    return this.stockQuantity + variantStock;
});
exports.Product = mongoose_1.default.model('Product', productSchema);
