import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';

class CategoryController {
  async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      sendSuccessResponse(res, categories, 'Categories retrieved successfully');
    } catch (error: any) {
      console.error('Get categories error:', error);
      sendErrorResponse(res, 'Failed to get categories', 500);
    }
  }

  // Admin: Get all categories (including inactive)
  async getAllCategoriesAdmin(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Category.find({})
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      sendSuccessResponse(res, categories, 'Admin categories retrieved successfully');
    } catch (error: any) {
      console.error('Get admin categories error:', error);
      sendErrorResponse(res, 'Failed to get categories', 500);
    }
  }

  // Admin: Create new category
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryData = req.body;
      
      // Generate slug if not provided
      if (!categoryData.slug) {
        categoryData.slug = categoryData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
      }

      const category = new Category(categoryData);
      await category.save();

      sendSuccessResponse(res, category, 'Category created successfully', 201);
    } catch (error: any) {
      console.error('Create category error:', error);
      if (error.code === 11000) {
        sendErrorResponse(res, 'Category with this name or slug already exists', 400);
      } else if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e: any) => e.message);
        sendErrorResponse(res, `Validation error: ${messages.join(', ')}`, 400);
      } else {
        sendErrorResponse(res, 'Failed to create category', 500);
      }
    }
  }

  // Admin: Update category
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!category) {
        sendErrorResponse(res, 'Category not found', 404);
        return;
      }

      sendSuccessResponse(res, category, 'Category updated successfully');
    } catch (error: any) {
      console.error('Update category error:', error);
      if (error.code === 11000) {
        sendErrorResponse(res, 'Category with this name or slug already exists', 400);
      } else if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e: any) => e.message);
        sendErrorResponse(res, `Validation error: ${messages.join(', ')}`, 400);
      } else {
        sendErrorResponse(res, 'Failed to update category', 500);
      }
    }
  }

  // Admin: Delete category
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if category has products
      const productCount = await Product.countDocuments({ category: id });
      if (productCount > 0) {
        sendErrorResponse(res, `Cannot delete category. It has ${productCount} products assigned to it.`, 400);
        return;
      }

      const category = await Category.findByIdAndDelete(id);

      if (!category) {
        sendErrorResponse(res, 'Category not found', 404);
        return;
      }

      sendSuccessResponse(res, null, 'Category deleted successfully');
    } catch (error: any) {
      console.error('Delete category error:', error);
      sendErrorResponse(res, 'Failed to delete category', 500);
    }
  }

  async getCategoryBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const category = await Category.findOne({ slug, isActive: true }).lean();

      if (!category) {
        sendErrorResponse(res, 'Category not found', 404);
        return;
      }

      sendSuccessResponse(res, category, 'Category retrieved successfully');
    } catch (error: any) {
      console.error('Get category error:', error);
      sendErrorResponse(res, 'Failed to get category', 500);
    }
  }

  async getProductsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = req.query.sortBy as string || 'name';
      const search = req.query.search as string;

      // Find category first
      const category = await Category.findOne({ slug, isActive: true });
      if (!category) {
        sendErrorResponse(res, 'Category not found', 404);
        return;
      }

      // Build query
      const query: any = { 
        category: category._id, 
        isActive: true 
      };

      // Add search if provided
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Build sort object
      let sortObject: any = {};
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

      // Get products with pagination
      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('category', 'name slug')
          .sort(sortObject)
          .limit(limit)
          .skip((page - 1) * limit)
          .lean(),
        Product.countDocuments(query)
      ]);

      const pages = Math.ceil(total / limit);

      const responseData = {
        products,
        category,
        pagination: {
          total,
          pages,
          currentPage: page,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };

      sendSuccessResponse(res, responseData, 'Products retrieved successfully');
    } catch (error: any) {
      console.error('Get products by category error:', error);
      sendErrorResponse(res, 'Failed to get products', 500);
    }
  }
}

export const categoryController = new CategoryController();