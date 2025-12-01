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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const helpers_1 = require("../utils/helpers");
const Product_1 = require("../models/Product");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const Category_1 = require("../models/Category");
const mongoose_1 = __importDefault(require("mongoose"));
class AdminController {
    async getDashboard(req, res) {
        try {
            const [totalProducts, totalOrders, totalCustomers, pendingOrders, todayOrders, lowStockProducts, outOfStockProducts, totalRevenue] = await Promise.all([
                Product_1.Product.countDocuments({ isActive: true }),
                Order_1.Order.countDocuments(),
                User_1.User.countDocuments({ role: 'customer' }),
                Order_1.Order.countDocuments({ status: 'pending' }),
                Order_1.Order.countDocuments({
                    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                }),
                Product_1.Product.countDocuments({ stockQuantity: { $gt: 0, $lte: 5 } }),
                Product_1.Product.countDocuments({ stockQuantity: 0 }),
                Order_1.Order.aggregate([
                    { $match: { paymentStatus: 'paid' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                ]).then(result => result[0]?.total || 0)
            ]);
            const recentOrders = await Order_1.Order.find()
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();
            const lowStockProductsList = await Product_1.Product.find({
                stockQuantity: { $gt: 0, $lte: 5 }
            })
                .populate('category', 'name')
                .select('name stockQuantity category')
                .limit(10)
                .lean();
            const dashboardData = {
                stats: {
                    totalProducts,
                    totalOrders,
                    totalCustomers,
                    totalRevenue,
                    pendingOrders,
                    todayOrders,
                    lowStockProducts,
                    outOfStockProducts
                },
                recentOrders: recentOrders.map((order) => ({
                    id: order.orderNumber,
                    customer: order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown',
                    customerEmail: order.user?.email || 'unknown@example.com',
                    total: order.totalAmount,
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    date: order.createdAt,
                    items: order.items
                })),
                lowStockProducts: lowStockProductsList.map((product) => ({
                    id: product._id,
                    name: product.name,
                    stock: product.stockQuantity,
                    category: product.category?.name || 'Uncategorized'
                }))
            };
            (0, helpers_1.sendSuccessResponse)(res, dashboardData, 'Dashboard data retrieved successfully');
        }
        catch (error) {
            console.error('Dashboard error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get dashboard data', 500);
        }
    }
    async getSalesAnalytics(req, res) {
        try {
            const { period = 'week' } = req.query;
            const startDate = new Date();
            if (period === 'week') {
                startDate.setDate(startDate.getDate() - 7);
            }
            else if (period === 'month') {
                startDate.setMonth(startDate.getMonth() - 1);
            }
            else if (period === 'year') {
                startDate.setFullYear(startDate.getFullYear() - 1);
            }
            const salesData = await Order_1.Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                labels: salesData.map(item => item._id),
                revenue: salesData.map(item => item.revenue),
                orders: salesData.map(item => item.orders)
            }, 'Sales analytics retrieved successfully');
        }
        catch (error) {
            console.error('Sales analytics error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get sales analytics', 500);
        }
    }
    async getProductAnalytics(req, res) {
        try {
            const [topSellingProducts, categoryDistribution, stockAnalysis] = await Promise.all([
                Order_1.Order.aggregate([
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product',
                            totalSold: { $sum: '$items.quantity' },
                            revenue: { $sum: '$items.totalPrice' }
                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    { $unwind: '$product' },
                    { $sort: { totalSold: -1 } },
                    { $limit: 10 }
                ]),
                Product_1.Product.aggregate([
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'category',
                            foreignField: '_id',
                            as: 'category'
                        }
                    },
                    { $unwind: '$category' },
                    {
                        $group: {
                            _id: '$category.name',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                Product_1.Product.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalProducts: { $sum: 1 },
                            inStock: { $sum: { $cond: [{ $gt: ['$stockQuantity', 0] }, 1, 0] } },
                            lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', 5] }] }, 1, 0] } },
                            outOfStock: { $sum: { $cond: [{ $eq: ['$stockQuantity', 0] }, 1, 0] } }
                        }
                    }
                ])
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                topSellingProducts,
                categoryDistribution,
                stockAnalysis: stockAnalysis[0] || { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
            }, 'Product analytics retrieved successfully');
        }
        catch (error) {
            console.error('Product analytics error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get product analytics', 500);
        }
    }
    async getCustomerAnalytics(req, res) {
        try {
            const [customerStats, topCustomers, customerGrowth] = await Promise.all([
                User_1.User.aggregate([
                    { $match: { role: 'customer' } },
                    {
                        $group: {
                            _id: null,
                            totalCustomers: { $sum: 1 },
                            activeCustomers: { $sum: { $cond: ['$isActive', 1, 0] } },
                            verifiedCustomers: { $sum: { $cond: ['$emailVerified', 1, 0] } }
                        }
                    }
                ]),
                Order_1.Order.aggregate([
                    { $match: { paymentStatus: 'paid' } },
                    {
                        $group: {
                            _id: '$user',
                            totalSpent: { $sum: '$totalAmount' },
                            orderCount: { $sum: 1 }
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'user'
                        }
                    },
                    { $unwind: '$user' },
                    { $sort: { totalSpent: -1 } },
                    { $limit: 10 }
                ]),
                User_1.User.aggregate([
                    {
                        $match: {
                            role: 'customer',
                            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                            },
                            newCustomers: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ])
            ]);
            (0, helpers_1.sendSuccessResponse)(res, {
                customerStats: customerStats[0] || { totalCustomers: 0, activeCustomers: 0, verifiedCustomers: 0 },
                topCustomers,
                customerGrowth
            }, 'Customer analytics retrieved successfully');
        }
        catch (error) {
            console.error('Customer analytics error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get customer analytics', 500);
        }
    }
    async getAllProducts(req, res) {
        try {
            const { page = 1, limit = 10, category, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const filter = {};
            if (category)
                filter.category = category;
            if (status)
                filter.isActive = status === 'active';
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } }
                ];
            }
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            const [products, total] = await Promise.all([
                Product_1.Product.find(filter)
                    .populate('category', 'name')
                    .sort(sort)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Product_1.Product.countDocuments(filter)
            ]);
            const formattedProducts = products.map((product) => ({
                _id: product._id,
                name: product.name,
                slug: product.slug,
                category: product.category?.name || 'Uncategorized',
                price: product.price,
                comparePrice: product.comparePrice,
                stockQuantity: product.stockQuantity,
                isActive: product.isActive,
                isFeatured: product.isFeatured,
                averageRating: product.averageRating || 0,
                reviewCount: product.reviewCount || 0,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
                images: product.images,
                description: product.description,
                tags: product.tags,
                variants: product.variants
            }));
            (0, helpers_1.sendSuccessResponse)(res, {
                products: formattedProducts,
                total,
                pages: Math.ceil(total / limitNum),
                currentPage: pageNum
            }, 'Products retrieved successfully');
        }
        catch (error) {
            console.error('Get products error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get products', 500);
        }
    }
    async createProduct(req, res) {
        try {
            const productData = req.body;
            if (!productData.slug) {
                productData.slug = productData.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }
            const product = new Product_1.Product(productData);
            await product.save();
            const populatedProduct = await Product_1.Product.findById(product._id)
                .populate('category', 'name')
                .lean();
            (0, helpers_1.sendSuccessResponse)(res, populatedProduct, 'Product created successfully');
        }
        catch (error) {
            console.error('Create product error:', error);
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map((err) => err.message);
                (0, helpers_1.sendErrorResponse)(res, errors.join(', '), 400);
            }
            else if (error.code === 11000) {
                (0, helpers_1.sendErrorResponse)(res, 'Product with this slug or SKU already exists', 400);
            }
            else {
                (0, helpers_1.sendErrorResponse)(res, 'Failed to create product', 500);
            }
        }
    }
    async getProduct(req, res) {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid product ID', 400);
                return;
            }
            const product = await Product_1.Product.findById(id)
                .populate('category', 'name')
                .lean();
            if (!product) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, product, 'Product retrieved successfully');
        }
        catch (error) {
            console.error('Get product error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get product', 500);
        }
    }
    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid product ID', 400);
                return;
            }
            if (updateData.category) {
                delete updateData.category;
            }
            const product = await Product_1.Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('category', 'name');
            if (!product) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, product, 'Product updated successfully');
        }
        catch (error) {
            console.error('Update product error:', error);
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map((err) => err.message);
                (0, helpers_1.sendErrorResponse)(res, errors.join(', '), 400);
            }
            else if (error.code === 11000) {
                (0, helpers_1.sendErrorResponse)(res, 'Product with this slug or SKU already exists', 400);
            }
            else {
                (0, helpers_1.sendErrorResponse)(res, 'Failed to update product', 500);
            }
        }
    }
    async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid product ID', 400);
                return;
            }
            const hasOrders = await Order_1.Order.exists({
                'items.product': id
            });
            if (hasOrders) {
                const product = await Product_1.Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
                if (!product) {
                    (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                    return;
                }
                (0, helpers_1.sendSuccessResponse)(res, { deactivated: true }, 'Product deactivated due to existing orders');
            }
            else {
                const product = await Product_1.Product.findByIdAndDelete(id);
                if (!product) {
                    (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                    return;
                }
                (0, helpers_1.sendSuccessResponse)(res, { deleted: true }, 'Product deleted successfully');
            }
        }
        catch (error) {
            console.error('Delete product error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to delete product', 500);
        }
    }
    async uploadProductImages(req, res) {
        try {
            const { id } = req.params;
            const files = req.files;
            console.log('Upload images request received');
            console.log('Product ID:', id);
            console.log('Files received:', files);
            console.log('Files type:', typeof files);
            console.log('Is array:', Array.isArray(files));
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid product ID', 400);
                return;
            }
            const product = await Product_1.Product.findById(id);
            if (!product) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                return;
            }
            console.log('Product found:', product.name);
            if (!files || (Array.isArray(files) && files.length === 0)) {
                (0, helpers_1.sendErrorResponse)(res, 'No files uploaded', 400);
                return;
            }
            const newImages = [];
            const { uploadToCloudinary } = await Promise.resolve().then(() => __importStar(require('../config/cloudinary')));
            if (Array.isArray(files)) {
                console.log('Processing array of files:', files.length);
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    console.log(`Processing file ${i}:`, file.originalname, file.mimetype, 'buffer size:', file.buffer?.length);
                    if (!file.buffer) {
                        throw new Error(`File ${i} has no buffer - multer storage might not be configured correctly`);
                    }
                    try {
                        const uploadResult = await uploadToCloudinary(file.buffer, {
                            folder: 'udehglobal/products',
                            filename: `${product.slug}-${Date.now()}-${i}`,
                        });
                        newImages.push({
                            url: uploadResult.secure_url,
                            altText: `${product.name} image ${product.images.length + i + 1}`,
                            displayOrder: product.images.length + i,
                            isPrimary: product.images.length === 0 && i === 0
                        });
                    }
                    catch (uploadError) {
                        console.error('Error uploading to Cloudinary:', uploadError);
                        throw new Error(`Failed to upload image ${i + 1}`);
                    }
                }
            }
            else {
                const primaryImages = files.primaryImage || [];
                const additionalImages = files.additionalImages || [];
                console.log('Processing multiple fields:');
                console.log('Primary images:', primaryImages.length);
                console.log('Additional images:', additionalImages.length);
                if (primaryImages.length > 0) {
                    console.log('Processing primary image:', primaryImages[0].originalname, primaryImages[0].mimetype);
                    if (!primaryImages[0].buffer) {
                        throw new Error('Primary image has no buffer - multer storage might not be configured correctly');
                    }
                    try {
                        const uploadResult = await uploadToCloudinary(primaryImages[0].buffer, {
                            folder: 'udehglobal/products',
                            filename: `${product.slug}-primary-${Date.now()}`,
                        });
                        product.images.forEach(img => img.isPrimary = false);
                        newImages.push({
                            url: uploadResult.secure_url,
                            : .length, i
                        }++);
                        {
                            const file = additionalImages[i];
                            console.log(`Processing additional image ${i}:`, file.originalname, file.mimetype);
                            if (!file.buffer) {
                                throw new Error(`Additional image ${i} has no buffer - multer storage might not be configured correctly`);
                            }
                            try {
                                const uploadResult = await uploadToCloudinary(file.buffer, {
                                    folder: 'udehglobal/products',
                                    filename: `${product.slug}-${Date.now()}-${i}`,
                                });
                            }
                            finally {
                            }
                            for (let i = 0; i < additionalImages.length; i++) {
                                const file = additionalImages[i];
                                try {
                                    const uploadResult = await uploadToCloudinary(file.buffer, {
                                        folder: 'udehglobal/products',
                                        filename: `${product.slug}-${Date.now()}-${i}`,
                                    });
                                    newImages.push({
                                        url: uploadResult.secure_url,
                                        altText: `${product.name} image ${product.images.length + i + 1}`,
                                        displayOrder: product.images.length + i,
                                        isPrimary: false
                                    });
                                }
                                catch (uploadError) {
                                    console.error(`Error uploading additional image ${i + 1}:`, uploadError);
                                    throw new Error(`Failed to upload additional image ${i + 1}`);
                                }
                            }
                        }
                        product.images.push(...newImages);
                        product.images.sort((a, b) => {
                            if (a.isPrimary && !b.isPrimary)
                                return -1;
                            if (!a.isPrimary && b.isPrimary)
                                return 1;
                            return a.displayOrder - b.displayOrder;
                        });
                        await product.save();
                        (0, helpers_1.sendSuccessResponse)(res, {
                            images: product.images,
                            uploadedCount: newImages.length
                        }, 'Images uploaded successfully');
                    }
                    catch (error) {
                        console.error('Upload images error:', error);
                        console.error('Error details:', {
                            message: error.message,
                            stack: error.stack,
                            name: error.name
                        });
                        (0, helpers_1.sendErrorResponse)(res, error.message || 'Failed to upload images', 500);
                    }
                }
                async;
                deleteProductImage(req, auth_1.AuthenticatedRequest, res, Response);
                Promise < void  > {
                    try: {
                        const: { id, imageId } = req.params,
                        if(, mongoose) { }, : .Types.ObjectId.isValid(id)
                    }
                };
                {
                    (0, helpers_1.sendErrorResponse)(res, 'Invalid product ID', 400);
                    return;
                }
                const product = await Product_1.Product.findById(id);
                if (!product) {
                    (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                    return;
                }
                product.images = product.images.filter((img) => img._id?.toString() !== imageId);
                await product.save();
                (0, helpers_1.sendSuccessResponse)(res, product.images, 'Image deleted successfully');
            }
            try { }
            catch (error) {
                console.error('Delete image error:', error);
                (0, helpers_1.sendErrorResponse)(res, 'Failed to delete image', 500);
            }
        }
        finally {
        }
        async;
        bulkUpdateProducts(req, auth_1.AuthenticatedRequest, res, Response);
        Promise < void  > {
            try: {
                const: { updates } = req.body,
                if(, Array) { }, : .isArray(updates) || updates.length === 0
            }
        };
        {
            (0, helpers_1.sendErrorResponse)(res, 'No updates provided', 400);
            return;
        }
        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: { _id: update.id },
                update: update.data,
                upsert: false
            }
        }));
        const result = await Product_1.Product.bulkWrite(bulkOps);
        (0, helpers_1.sendSuccessResponse)(res, {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        }, 'Products updated successfully');
    }
    catch(error) {
        console.error('Bulk update error:', error);
        (0, helpers_1.sendErrorResponse)(res, 'Failed to update products', 500);
    }
}
async;
getAllCategories(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: categories = await Category_1.Category.find()
            .sort({ name: 1 })
            .lean(),
        const: categoriesWithCount = await Promise.all(categories.map(async (category) => {
            const productCount = await Product_1.Product.countDocuments({
                category: category._id,
                isActive: true
            });
            return {
                _id: category._id,
                name: category.name,
                description: category.description,
                slug: category.slug,
                isActive: category.isActive,
                productsCount: productCount,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt
            };
        }))
    }, catch(error) {
        console.error('Get categories error:', error);
        (0, helpers_1.sendErrorResponse)(res, 'Failed to get categories', 500);
    }
};
async;
createCategory(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { name, description, isActive = true } = req.body,
        const: slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
        const: category = new Category_1.Category({
            name,
            description,
            slug,
            isActive
        }),
        await, category, : .save(),
        sendSuccessResponse(res, { id: category }) { }, : ._id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        isActive: category.isActive,
        productsCount: 0
    }, 'Category created successfully': 
};
try { }
catch (error) {
    console.error('Create category error:', error);
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        (0, helpers_1.sendErrorResponse)(res, errors.join(', '), 400);
    }
    else if (error.code === 11000) {
        (0, helpers_1.sendErrorResponse)(res, 'Category with this name or slug already exists', 400);
    }
    else {
        (0, helpers_1.sendErrorResponse)(res, 'Failed to create category', 500);
    }
}
async;
updateCategory(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        const: updateData = req.body,
        if(, mongoose) { }, : .Types.ObjectId.isValid(id)
    }
};
{
    (0, helpers_1.sendErrorResponse)(res, 'Invalid category ID', 400);
    return;
}
if (updateData.name) {
    updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
const category = await Category_1.Category.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
if (!category) {
    (0, helpers_1.sendErrorResponse)(res, 'Category not found', 404);
    return;
}
const productCount = await Product_1.Product.countDocuments({
    category: category._id,
    isActive: true
});
(0, helpers_1.sendSuccessResponse)(res, {
    id: category._id,
    name: category.name,
    description: category.description,
    slug: category.slug,
    isActive: category.isActive,
    productsCount: productCount
}, 'Category updated successfully');
try { }
catch (error) {
    console.error('Update category error:', error);
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        (0, helpers_1.sendErrorResponse)(res, errors.join(', '), 400);
    }
    else if (error.code === 11000) {
        (0, helpers_1.sendErrorResponse)(res, 'Category with this name or slug already exists', 400);
    }
    else {
        (0, helpers_1.sendErrorResponse)(res, 'Failed to update category', 500);
    }
}
async;
deleteCategory(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        if(, mongoose) { }, : .Types.ObjectId.isValid(id)
    }
};
{
    (0, helpers_1.sendErrorResponse)(res, 'Invalid category ID', 400);
    return;
}
const hasProducts = await Product_1.Product.exists({ category: id });
if (hasProducts) {
    (0, helpers_1.sendErrorResponse)(res, 'Cannot delete category with existing products', 400);
    return;
}
const category = await Category_1.Category.findByIdAndDelete(id);
if (!category) {
    (0, helpers_1.sendErrorResponse)(res, 'Category not found', 404);
    return;
}
(0, helpers_1.sendSuccessResponse)(res, { deleted: true }, 'Category deleted successfully');
try { }
catch (error) {
    console.error('Delete category error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to delete category', 500);
}
async;
reorderCategories(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {}, catch(error) {
        (0, helpers_1.sendErrorResponse)(res, 'Failed to reorder categories', 500);
    }
};
async;
getAllOrders(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: {
            page = 1,
            limit = 15,
            status,
            paymentStatus,
            search,
            dateFrom,
            dateTo,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query,
        const: pageNum = parseInt(page),
        const: limitNum = parseInt(limit),
        const: skip = (pageNum - 1) * limitNum,
        const: filter, any = {},
        if(status) { }, filter, : .status = status,
        if(paymentStatus) { }, filter, : .paymentStatus = paymentStatus,
        if(dateFrom) { }
    } || dateTo
};
{
    filter.createdAt = {};
    if (dateFrom)
        filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)
        filter.createdAt.$lte = new Date(dateTo);
}
if (search) {
    filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } }
    ];
}
const sort = {};
sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
const [orders, total] = await Promise.all([
    Order_1.Order.find(filter)
        .populate('user', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
    Order_1.Order.countDocuments(filter)
]);
const formattedOrders = orders.map((order) => ({
    id: order.orderNumber,
    customerId: order.user?._id,
    customerName: order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown',
    customerEmail: order.user?.email || 'unknown@example.com',
    items: order.items.map((item) => ({
        id: item._id || item.product,
        productId: item.product,
        productName: item.productSnapshot.name,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.totalPrice
    })),
    total: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    trackingNumber: order.trackingNumber,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
}));
(0, helpers_1.sendSuccessResponse)(res, {
    orders: formattedOrders,
    total,
    pages: Math.ceil(total / limitNum),
    currentPage: pageNum
}, 'Orders retrieved successfully');
try { }
catch (error) {
    console.error('Get orders error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to get orders', 500);
}
async;
getOrder(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        const: order, any = await Order_1.Order.findOne({ orderNumber: id })
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name images')
            .lean(),
        if(, order) {
            (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
            return;
        },
        const: formattedOrder = {
            id: order.orderNumber,
            customerId: order.user?._id,
            customerName: order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown',
            customerEmail: order.user?.email || 'unknown@example.com',
            items: order.items.map((item) => ({
                id: item._id || item.product,
                productId: item.product,
                productName: item.productSnapshot.name,
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.totalPrice
            })),
            total: order.totalAmount,
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            shippingAmount: order.shippingAmount,
            discountAmount: order.discountAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            trackingNumber: order.trackingNumber,
            notes: order.notes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        }
    }, catch(error) {
        console.error('Get order error:', error);
        (0, helpers_1.sendErrorResponse)(res, 'Failed to get order', 500);
    }
};
async;
updateOrderStatus(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        const: { status, notes } = req.body,
        const: validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        if(, validStatuses) { }, : .includes(status)
    }
};
{
    (0, helpers_1.sendErrorResponse)(res, 'Invalid status', 400);
    return;
}
const order = await Order_1.Order.findOne({ orderNumber: id });
if (!order) {
    (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
    return;
}
order.status = status;
if (notes)
    order.notes = notes;
await order.save();
(0, helpers_1.sendSuccessResponse)(res, {
    orderNumber: order.orderNumber,
    status: order.status,
    notes: order.notes
}, 'Order status updated successfully');
try { }
catch (error) {
    console.error('Update order status error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to update order status', 500);
}
async;
updateOrderTracking(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        const: { trackingNumber } = req.body,
        const: order = await Order_1.Order.findOne({ orderNumber: id }),
        if(, order) {
            (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
            return;
        },
        order, : .trackingNumber = trackingNumber,
        if(, order) { }, : .status || order.status === 'pending'
    }
};
{
    order.status = 'shipped';
}
await order.save();
(0, helpers_1.sendSuccessResponse)(res, {
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
    status: order.status
}, 'Order tracking updated successfully');
try { }
catch (error) {
    console.error('Update tracking error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to update order tracking', 500);
}
async;
processRefund(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        const: { amount, reason } = req.body,
        const: order = await Order_1.Order.findOne({ orderNumber: id }),
        if(, order) {
            (0, helpers_1.sendErrorResponse)(res, 'Order not found', 404);
            return;
        },
        if(order) { }, : .paymentStatus !== 'paid'
    }
};
{
    (0, helpers_1.sendErrorResponse)(res, 'Cannot refund unpaid order', 400);
    return;
}
order.paymentStatus = 'refunded';
order.status = 'cancelled';
if (reason)
    order.notes = (order.notes || '') + ` Refunded: ${reason}`;
await order.save();
(0, helpers_1.sendSuccessResponse)(res, {
    orderNumber: order.orderNumber,
    refundAmount: amount || order.totalAmount,
    status: order.status
}, 'Refund processed successfully');
try { }
catch (error) {
    console.error('Process refund error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to process refund', 500);
}
async;
getAllUsers(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: {
            page = 1,
            limit = 15,
            role = 'customer',
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query,
        const: pageNum = parseInt(page),
        const: limitNum = parseInt(limit),
        const: skip = (pageNum - 1) * limitNum,
        const: filter, any = { role },
        if(status) { }, filter, : .isActive = status === 'active',
        if(search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        },
        const: sort, any = {},
        sort, [sortBy]:  = sortOrder === 'asc' ? 1 : -1,
        const: [users, total] = await Promise.all([
            User_1.User.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .select('-password -refreshTokens')
                .lean(),
            User_1.User.countDocuments(filter)
        ]),
        const: userIds = users.map(user => user._id),
        const: userStats = await Order_1.Order.aggregate([
            {
                $match: {
                    user: { $in: userIds },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: '$user',
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' },
                    lastOrderDate: { $max: '$createdAt' }
                }
            }
        ]),
        const: statsMap = new Map(),
        userStats, : .forEach(stat => {
            statsMap.set(stat._id.toString(), stat);
        }),
        const: formattedUsers = users.map(user => {
            const stats = statsMap.get(user._id.toString()) || {
                totalOrders: 0,
                totalSpent: 0,
                lastOrderDate: null
            };
            return {
                id: user._id,
                name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unknown',
                email: user.email,
                phone: user.phone,
                status: user.isActive ? 'active' : 'inactive',
                emailVerified: user.emailVerified,
                dateJoined: user.createdAt,
                lastLogin: user.lastLogin,
                totalOrders: stats.totalOrders,
                totalSpent: stats.totalSpent,
                lastOrderDate: stats.lastOrderDate
            };
        }),
        sendSuccessResponse(res, { customers: formattedUsers, total, pages: Math }) { }, : .ceil(total / limitNum),
        currentPage: pageNum
    }, 'Users retrieved successfully': 
};
try { }
catch (error) {
    console.error('Get users error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to get users', 500);
}
async;
getUser(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        if(, mongoose) { }, : .Types.ObjectId.isValid(id)
    }
};
{
    (0, helpers_1.sendErrorResponse)(res, 'Invalid user ID', 400);
    return;
}
const user = await User_1.User.findById(id)
    .select('-password -refreshTokens')
    .lean();
if (!user) {
    (0, helpers_1.sendErrorResponse)(res, 'User not found', 404);
    return;
}
const orderStats = await Order_1.Order.aggregate([
    {
        $match: {
            user: new mongoose_1.default.Types.ObjectId(id),
            paymentStatus: 'paid'
        }
    },
    {
        $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            lastOrderDate: { $max: '$createdAt' }
        }
    }
]);
const stats = orderStats[0] || {
    totalOrders: 0,
    totalSpent: 0,
    lastOrderDate: null
};
const userWithStats = {
    ...user,
    totalOrders: stats.totalOrders,
    totalSpent: stats.totalSpent,
    lastOrderDate: stats.lastOrderDate
};
(0, helpers_1.sendSuccessResponse)(res, userWithStats, 'User retrieved successfully');
try { }
catch (error) {
    console.error('Get user error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to get user', 500);
}
async;
updateUserStatus(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: { id } = req.params,
        const: { isActive } = req.body,
        if(, mongoose) { }, : .Types.ObjectId.isValid(id)
    }
};
{
    (0, helpers_1.sendErrorResponse)(res, 'Invalid user ID', 400);
    return;
}
const user = await User_1.User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password -refreshTokens');
if (!user) {
    (0, helpers_1.sendErrorResponse)(res, 'User not found', 404);
    return;
}
(0, helpers_1.sendSuccessResponse)(res, {
    id: user._id,
    isActive: user.isActive
}, 'User status updated successfully');
try { }
catch (error) {
    console.error('Update user status error:', error);
    (0, helpers_1.sendErrorResponse)(res, 'Failed to update user status', 500);
}
async;
addUserNote(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {}, catch(error) {
        (0, helpers_1.sendErrorResponse)(res, 'Failed to add user note', 500);
    }
};
async;
getSettings(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: settings = {
            storeName: 'UdehGlobal',
            storeDescription: 'Premium footwear and accessories',
            currency: 'NGN',
            timezone: 'Africa/Lagos',
            emailNotifications: true,
            smsNotifications: false,
            lowStockThreshold: 5,
            orderAutoApproval: false,
            maintenanceMode: false
        }
    }, catch(error) {
        console.error('Get settings error:', error);
        (0, helpers_1.sendErrorResponse)(res, 'Failed to get settings', 500);
    }
};
async;
updateSettings(req, auth_1.AuthenticatedRequest, res, Response);
Promise < void  > {
    try: {
        const: updatedSettings = req.body
    }, catch(error) {
        console.error('Update settings error:', error);
        (0, helpers_1.sendErrorResponse)(res, 'Failed to update settings', 500);
    }
};
exports.adminController = new AdminController();
