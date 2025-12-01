"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = void 0;
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const helpers_1 = require("../utils/helpers");
const productTransformer_1 = require("../utils/productTransformer");
class ProductController {
    async getAllProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sortBy = req.query.sortBy || 'name';
            const category = req.query.category;
            const search = req.query.search;
            const priceMin = parseFloat(req.query.priceMin);
            const priceMax = parseFloat(req.query.priceMax);
            const inStock = req.query.inStock === 'true';
            const query = { isActive: true };
            if (category) {
                const categoryDoc = await Category_1.Category.findOne({ slug: category });
                if (categoryDoc) {
                    query.category = categoryDoc._id;
                }
            }
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $in: [new RegExp(search, 'i')] } }
                ];
            }
            if (!isNaN(priceMin) && !isNaN(priceMax)) {
                query.price = { $gte: priceMin, $lte: priceMax };
            }
            else if (!isNaN(priceMin)) {
                query.price = { $gte: priceMin };
            }
            else if (!isNaN(priceMax)) {
                query.price = { $lte: priceMax };
            }
            if (inStock) {
                query.stockQuantity = { $gt: 0 };
            }
            let sortObject = {};
            switch (sortBy) {
                case 'price-low':
                    sortObject = { price: 1 };
                    break;
                case 'price-high':
                    sortObject = { price: -1 };
                    break;
                case 'newest':
                    sortObject = { createdAt: -1 };
                    break;
                case 'name':
                default:
                    sortObject = { name: 1 };
                    break;
            }
            const [products, total] = await Promise.all([
                Product_1.Product.find(query)
                    .populate('category', 'name slug')
                    .sort(sortObject)
                    .limit(limit)
                    .skip((page - 1) * limit)
                    .lean(),
                Product_1.Product.countDocuments(query)
            ]);
            const pages = Math.ceil(total / limit);
            const responseData = {
                products: (0, productTransformer_1.transformProducts)(products),
                total,
                pages,
                currentPage: page,
                hasNext: page < pages,
                hasPrev: page > 1
            };
            (0, helpers_1.sendSuccessResponse)(res, responseData, 'Products retrieved successfully');
        }
        catch (error) {
            console.error('Get products error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get products', 500);
        }
    }
    async searchProducts(req, res) {
        try {
            const query = req.query.q;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sortBy = req.query.sortBy || 'relevance';
            const category = req.query.category;
            const minPrice = parseFloat(req.query.minPrice);
            const maxPrice = parseFloat(req.query.maxPrice);
            const minRating = parseFloat(req.query.minRating);
            const inStock = req.query.inStock === 'true';
            if (!query) {
                (0, helpers_1.sendErrorResponse)(res, 'Search query is required', 400);
                return;
            }
            const searchQuery = {
                isActive: true,
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } }
                ]
            };
            if (category) {
                const categoryDoc = await Category_1.Category.findOne({ slug: category });
                if (categoryDoc) {
                    searchQuery.category = categoryDoc._id;
                }
            }
            if (!isNaN(minPrice) || !isNaN(maxPrice)) {
                searchQuery.price = {};
                if (!isNaN(minPrice))
                    searchQuery.price.$gte = minPrice;
                if (!isNaN(maxPrice))
                    searchQuery.price.$lte = maxPrice;
            }
            if (!isNaN(minRating)) {
                searchQuery.averageRating = { $gte: minRating };
            }
            if (inStock) {
                searchQuery.stock = { $gt: 0 };
            }
            let sortOptions = {};
            switch (sortBy) {
                case 'price-low':
                    sortOptions = { price: 1 };
                    break;
                case 'price-high':
                    sortOptions = { price: -1 };
                    break;
                case 'rating':
                    sortOptions = { averageRating: -1, reviewCount: -1 };
                    break;
                case 'newest':
                    sortOptions = { createdAt: -1 };
                    break;
                case 'name':
                    sortOptions = { name: 1 };
                    break;
                default:
                    sortOptions = { name: 1 };
            }
            const [products, total] = await Promise.all([
                Product_1.Product.find(searchQuery)
                    .populate('category', 'name slug')
                    .sort(sortOptions)
                    .limit(limit)
                    .skip((page - 1) * limit)
                    .lean(),
                Product_1.Product.countDocuments(searchQuery)
            ]);
            const pages = Math.ceil(total / limit);
            const [categories, priceRange] = await Promise.all([
                Product_1.Product.distinct('category', { ...searchQuery, category: { $exists: true } })
                    .then(ids => Category_1.Category.find({ _id: { $in: ids } }, 'name slug').lean()),
                Product_1.Product.aggregate([
                    { $match: searchQuery },
                    {
                        $group: {
                            _id: null,
                            minPrice: { $min: '$price' },
                            maxPrice: { $max: '$price' }
                        }
                    }
                ])
            ]);
            const responseData = {
                products: (0, productTransformer_1.transformProducts)(products),
                total,
                pages,
                currentPage: page,
                query,
                filters: {
                    categories: categories || [],
                    priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
                }
            };
            (0, helpers_1.sendSuccessResponse)(res, responseData, 'Search completed successfully');
        }
        catch (error) {
            console.error('Search error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Search failed', 500);
        }
    }
    async getSearchSuggestions(req, res) {
        try {
            const query = req.query.q;
            const limit = parseInt(req.query.limit) || 10;
            if (!query || query.length < 2) {
                (0, helpers_1.sendSuccessResponse)(res, { suggestions: [] }, 'Suggestions retrieved');
                return;
            }
            const productSuggestions = await Product_1.Product.find({
                isActive: true,
                name: { $regex: query, $options: 'i' }
            })
                .select('name')
                .limit(limit)
                .lean();
            const categorySuggestions = await Category_1.Category.find({
                name: { $regex: query, $options: 'i' }
            })
                .select('name slug')
                .limit(5)
                .lean();
            const tagSuggestions = await Product_1.Product.aggregate([
                { $match: { isActive: true, tags: { $regex: query, $options: 'i' } } },
                { $unwind: '$tags' },
                { $match: { tags: { $regex: query, $options: 'i' } } },
                { $group: { _id: '$tags' } },
                { $limit: 5 }
            ]);
            const suggestions = {
                products: productSuggestions.map(p => ({
                    type: 'product',
                    text: p.name,
                    value: p.name
                })),
                categories: categorySuggestions.map(c => ({
                    type: 'category',
                    text: c.name,
                    value: c.slug
                })),
                tags: tagSuggestions.map(t => ({
                    type: 'tag',
                    text: t._id,
                    value: t._id
                }))
            };
            (0, helpers_1.sendSuccessResponse)(res, suggestions, 'Suggestions retrieved successfully');
        }
        catch (error) {
            console.error('Suggestions error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get suggestions', 500);
        }
    }
    async getFeaturedProducts(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 8;
            const products = await Product_1.Product.find({
                isActive: true,
                isFeatured: true
            })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            (0, helpers_1.sendSuccessResponse)(res, (0, productTransformer_1.transformProducts)(products), 'Featured products retrieved successfully');
        }
        catch (error) {
            console.error('Get featured products error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get featured products', 500);
        }
    }
    async getProductBySlug(req, res) {
        try {
            const { slug } = req.params;
            const product = await Product_1.Product.findOne({ slug, isActive: true })
                .populate('category', 'name slug')
                .lean();
            if (!product) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, (0, productTransformer_1.transformProduct)(product), 'Product retrieved successfully');
        }
        catch (error) {
            console.error('Get product error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get product', 500);
        }
    }
    async getProductVariants(req, res) {
        try {
            const { slug } = req.params;
            const product = await Product_1.Product.findOne({ slug, isActive: true })
                .select('variants')
                .lean();
            if (!product) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, product.variants || [], 'Product variants retrieved successfully');
        }
        catch (error) {
            console.error('Get product variants error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get product variants', 500);
        }
    }
    async getProductReviews(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, [], 'Product reviews retrieved successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get product reviews', 500);
        }
    }
    async addProductReview(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Review added successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to add review', 500);
        }
    }
    async getRelatedProducts(req, res) {
        try {
            const { slug } = req.params;
            const limit = parseInt(req.query.limit) || 4;
            const product = await Product_1.Product.findOne({ slug, isActive: true });
            if (!product) {
                (0, helpers_1.sendErrorResponse)(res, 'Product not found', 404);
                return;
            }
            const relatedProducts = await Product_1.Product.find({
                _id: { $ne: product._id },
                category: product.category,
                isActive: true
            })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            (0, helpers_1.sendSuccessResponse)(res, (0, productTransformer_1.transformProducts)(relatedProducts), 'Related products retrieved successfully');
        }
        catch (error) {
            console.error('Get related products error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get related products', 500);
        }
    }
}
exports.productController = new ProductController();
