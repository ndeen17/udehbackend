"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = void 0;
const Category_1 = require("../models/Category");
const Product_1 = require("../models/Product");
const helpers_1 = require("../utils/helpers");
const productTransformer_1 = require("../utils/productTransformer");
class CategoryController {
    async getAllCategories(req, res) {
        try {
            const categories = await Category_1.Category.find({ isActive: true })
                .sort({ displayOrder: 1, name: 1 })
                .lean();
            (0, helpers_1.sendSuccessResponse)(res, categories, 'Categories retrieved successfully');
        }
        catch (error) {
            console.error('Get categories error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get categories', 500);
        }
    }
    async getAllCategoriesAdmin(req, res) {
        try {
            const categories = await Category_1.Category.find({})
                .sort({ displayOrder: 1, name: 1 })
                .lean();
            (0, helpers_1.sendSuccessResponse)(res, categories, 'Admin categories retrieved successfully');
        }
        catch (error) {
            console.error('Get admin categories error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get categories', 500);
        }
    }
    async createCategory(req, res) {
        try {
            const categoryData = req.body;
            if (!categoryData.slug) {
                categoryData.slug = categoryData.name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .trim();
            }
            const category = new Category_1.Category(categoryData);
            await category.save();
            (0, helpers_1.sendSuccessResponse)(res, category, 'Category created successfully', 201);
        }
        catch (error) {
            console.error('Create category error:', error);
            if (error.code === 11000) {
                (0, helpers_1.sendErrorResponse)(res, 'Category with this name or slug already exists', 400);
            }
            else if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((e) => e.message);
                (0, helpers_1.sendErrorResponse)(res, `Validation error: ${messages.join(', ')}`, 400);
            }
            else {
                (0, helpers_1.sendErrorResponse)(res, 'Failed to create category', 500);
            }
        }
    }
    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const category = await Category_1.Category.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
            if (!category) {
                (0, helpers_1.sendErrorResponse)(res, 'Category not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, category, 'Category updated successfully');
        }
        catch (error) {
            console.error('Update category error:', error);
            if (error.code === 11000) {
                (0, helpers_1.sendErrorResponse)(res, 'Category with this name or slug already exists', 400);
            }
            else if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((e) => e.message);
                (0, helpers_1.sendErrorResponse)(res, `Validation error: ${messages.join(', ')}`, 400);
            }
            else {
                (0, helpers_1.sendErrorResponse)(res, 'Failed to update category', 500);
            }
        }
    }
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const productCount = await Product_1.Product.countDocuments({ category: id });
            if (productCount > 0) {
                (0, helpers_1.sendErrorResponse)(res, `Cannot delete category. It has ${productCount} products assigned to it.`, 400);
                return;
            }
            const category = await Category_1.Category.findByIdAndDelete(id);
            if (!category) {
                (0, helpers_1.sendErrorResponse)(res, 'Category not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, null, 'Category deleted successfully');
        }
        catch (error) {
            console.error('Delete category error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to delete category', 500);
        }
    }
    async getCategoryBySlug(req, res) {
        try {
            const { slug } = req.params;
            const category = await Category_1.Category.findOne({ slug, isActive: true }).lean();
            if (!category) {
                (0, helpers_1.sendErrorResponse)(res, 'Category not found', 404);
                return;
            }
            (0, helpers_1.sendSuccessResponse)(res, category, 'Category retrieved successfully');
        }
        catch (error) {
            console.error('Get category error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get category', 500);
        }
    }
    async getProductsByCategory(req, res) {
        try {
            const { slug } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sortBy = req.query.sortBy || 'name';
            const search = req.query.search;
            const category = await Category_1.Category.findOne({ slug, isActive: true });
            if (!category) {
                (0, helpers_1.sendErrorResponse)(res, 'Category not found', 404);
                return;
            }
            const query = {
                category: category._id,
                isActive: true
            };
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $in: [new RegExp(search, 'i')] } }
                ];
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
                category,
                pagination: {
                    total,
                    pages,
                    currentPage: page,
                    hasNext: page < pages,
                    hasPrev: page > 1
                }
            };
            (0, helpers_1.sendSuccessResponse)(res, responseData, 'Products retrieved successfully');
        }
        catch (error) {
            console.error('Get products by category error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get products', 500);
        }
    }
}
exports.categoryController = new CategoryController();
