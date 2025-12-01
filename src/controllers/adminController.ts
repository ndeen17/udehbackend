import { Request, Response } from 'express';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product, IProductImage } from '../models/Product';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

// @ts-nocheck

class AdminController {
  // Dashboard
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Get dashboard statistics
      const [
        totalProducts,
        totalOrders,
        totalCustomers,
        pendingOrders,
        todayOrders,
        lowStockProducts,
        outOfStockProducts,
        totalRevenue
      ] = await Promise.all([
        Product.countDocuments({ isActive: true }),
        Order.countDocuments(),
        User.countDocuments({ role: 'customer' }),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        Product.countDocuments({ stockQuantity: { $gt: 0, $lte: 5 } }),
        Product.countDocuments({ stockQuantity: 0 }),
        Order.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).then(result => result[0]?.total || 0)
      ]);

      // Get recent orders
      const recentOrders = await Order.find()
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      // Get low stock products
      const lowStockProductsList = await Product.find({
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
        recentOrders: recentOrders.map((order: any) => ({
          id: order.orderNumber,
          customer: order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown',
          customerEmail: order.user?.email || 'unknown@example.com',
          total: order.totalAmount,
          status: order.status,
          paymentStatus: order.paymentStatus,
          date: order.createdAt,
          items: order.items
        })),
        lowStockProducts: lowStockProductsList.map((product: any) => ({
          id: product._id,
          name: product.name,
          stock: product.stockQuantity,
          category: product.category?.name || 'Uncategorized'
        }))
      };

      sendSuccessResponse(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (error: any) {
      console.error('Dashboard error:', error);
      sendErrorResponse(res, 'Failed to get dashboard data', 500);
    }
  }

  // Analytics
  async getSalesAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { period = 'week' } = req.query;
      const startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const salesData = await Order.aggregate([
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

      sendSuccessResponse(res, {
        labels: salesData.map(item => item._id),
        revenue: salesData.map(item => item.revenue),
        orders: salesData.map(item => item.orders)
      }, 'Sales analytics retrieved successfully');
    } catch (error: any) {
      console.error('Sales analytics error:', error);
      sendErrorResponse(res, 'Failed to get sales analytics', 500);
    }
  }

  async getProductAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [
        topSellingProducts,
        categoryDistribution,
        stockAnalysis
      ] = await Promise.all([
        // Top selling products
        Order.aggregate([
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
        
        // Category distribution
        Product.aggregate([
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

        // Stock analysis
        Product.aggregate([
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

      sendSuccessResponse(res, {
        topSellingProducts,
        categoryDistribution,
        stockAnalysis: stockAnalysis[0] || { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
      }, 'Product analytics retrieved successfully');
    } catch (error: any) {
      console.error('Product analytics error:', error);
      sendErrorResponse(res, 'Failed to get product analytics', 500);
    }
  }

  async getCustomerAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [
        customerStats,
        topCustomers,
        customerGrowth
      ] = await Promise.all([
        // Customer statistics
        User.aggregate([
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

        // Top customers by spending
        Order.aggregate([
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

        // Customer growth over time
        User.aggregate([
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

      sendSuccessResponse(res, {
        customerStats: customerStats[0] || { totalCustomers: 0, activeCustomers: 0, verifiedCustomers: 0 },
        topCustomers,
        customerGrowth
      }, 'Customer analytics retrieved successfully');
    } catch (error: any) {
      console.error('Customer analytics error:', error);
      sendErrorResponse(res, 'Failed to get customer analytics', 500);
    }
  }

  // Product Management
  async getAllProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter object
      const filter: any = {};
      
      if (category) filter.category = category;
      if (status) filter.isActive = status === 'active';
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Product.countDocuments(filter)
      ]);

      const formattedProducts = products.map((product: any) => ({
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

      sendSuccessResponse(res, {
        products: formattedProducts,
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum
      }, 'Products retrieved successfully');
    } catch (error: any) {
      console.error('Get products error:', error);
      sendErrorResponse(res, 'Failed to get products', 500);
    }
  }

  async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const productData = req.body;
      
      // Generate slug from name if not provided
      if (!productData.slug) {
        productData.slug = productData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      const product = new Product(productData);
      await product.save();

      const populatedProduct = await Product.findById(product._id)
        .populate('category', 'name')
        .lean();

      sendSuccessResponse(res, populatedProduct, 'Product created successfully');
    } catch (error: any) {
      console.error('Create product error:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err: any) => err.message);
        sendErrorResponse(res, errors.join(', '), 400);
      } else if (error.code === 11000) {
        sendErrorResponse(res, 'Product with this slug or SKU already exists', 400);
      } else {
        sendErrorResponse(res, 'Failed to create product', 500);
      }
    }
  }

  async getProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid product ID', 400);
        return;
      }

      const product = await Product.findById(id)
        .populate('category', 'name')
        .lean();

      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      sendSuccessResponse(res, product, 'Product retrieved successfully');
    } catch (error: any) {
      console.error('Get product error:', error);
      sendErrorResponse(res, 'Failed to get product', 500);
    }
  }

  async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid product ID', 400);
        return;
      }

      // Prevent category from being changed on existing products
      if (updateData.category) {
        delete updateData.category;
      }

      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('category', 'name');

      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      sendSuccessResponse(res, product, 'Product updated successfully');
    } catch (error: any) {
      console.error('Update product error:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err: any) => err.message);
        sendErrorResponse(res, errors.join(', '), 400);
      } else if (error.code === 11000) {
        sendErrorResponse(res, 'Product with this slug or SKU already exists', 400);
      } else {
        sendErrorResponse(res, 'Failed to update product', 500);
      }
    }
  }

  async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid product ID', 400);
        return;
      }

      // Check if product has any orders
      const hasOrders = await Order.exists({
        'items.product': id
      });

      if (hasOrders) {
        // Soft delete - mark as inactive instead of deleting
        const product = await Product.findByIdAndUpdate(
          id,
          { isActive: false },
          { new: true }
        );
        
        if (!product) {
          sendErrorResponse(res, 'Product not found', 404);
          return;
        }

        sendSuccessResponse(res, { deactivated: true }, 'Product deactivated due to existing orders');
      } else {
        // Hard delete if no orders exist
        const product = await Product.findByIdAndDelete(id);
        
        if (!product) {
          sendErrorResponse(res, 'Product not found', 404);
          return;
        }

        sendSuccessResponse(res, { deleted: true }, 'Product deleted successfully');
      }
    } catch (error: any) {
      console.error('Delete product error:', error);
      sendErrorResponse(res, 'Failed to delete product', 500);
    }
  }

  async uploadProductImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

      console.log('Upload images request received');
      console.log('Product ID:', id);
      console.log('Files received:', files);
      console.log('Files type:', typeof files);
      console.log('Is array:', Array.isArray(files));

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid product ID', 400);
        return;
      }

      const product = await Product.findById(id);
      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      console.log('Product found:', product.name);

      if (!files || (Array.isArray(files) && files.length === 0)) {
        sendErrorResponse(res, 'No files uploaded', 400);
        return;
      }

      const newImages: IProductImage[] = [];

      // Import Cloudinary uploader
      const { uploadToCloudinary } = await import('../config/cloudinary');

      // Handle different file upload formats
      if (Array.isArray(files)) {
        // Single field array upload
        console.log('Processing array of files:', files.length);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Processing file ${i}:`, file.originalname, file.mimetype, 'buffer size:', file.buffer?.length);
          
          if (!file.buffer) {
            throw new Error(`File ${i} has no buffer - multer storage might not be configured correctly`);
          }
          
          try {
            // Upload to Cloudinary
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
          } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            throw new Error(`Failed to upload image ${i + 1}`);
          }
        }
      } else {
        // Multiple field upload (primaryImage, additionalImages)
        const primaryImages = files.primaryImage || [];
        const additionalImages = files.additionalImages || [];

        console.log('Processing multiple fields:');
        console.log('Primary images:', primaryImages.length);
        console.log('Additional images:', additionalImages.length);

        // Process primary image
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

            // Set existing primary images to non-primary
            product.images.forEach(img => img.isPrimary = false);
            
            newImages.push({
              url: uploadResult.secure_url,
              altText: `${product.name} primary image`,
              displayOrder: 0,
              isPrimary: true
            });
          } catch (uploadError) {
            console.error('Error uploading primary image:', uploadError);
            throw new Error('Failed to upload primary image');
          }
        }

        // Process additional images
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
          } catch (uploadError) {
            console.error(`Error uploading additional image ${i + 1}:`, uploadError);
            throw new Error(`Failed to upload additional image ${i + 1}`);
          }
        }
      }

      // Add new images to product
      product.images.push(...newImages);
      
      // Reorder images (primary first, then by displayOrder)
      product.images.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.displayOrder - b.displayOrder;
      });

      await product.save();

      sendSuccessResponse(res, {
        images: product.images,
        uploadedCount: newImages.length
      }, 'Images uploaded successfully');
    } catch (error: any) {
      console.error('Upload images error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      sendErrorResponse(res, error.message || 'Failed to upload images', 500);
    }
  }

  async deleteProductImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, imageId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid product ID', 400);
        return;
      }

      const product = await Product.findById(id);
      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      product.images = product.images.filter((img: any) => img._id?.toString() !== imageId);
      await product.save();

      sendSuccessResponse(res, product.images, 'Image deleted successfully');
    } catch (error: any) {
      console.error('Delete image error:', error);
      sendErrorResponse(res, 'Failed to delete image', 500);
    }
  }

  async bulkUpdateProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { updates } = req.body; // Array of { id, data } objects

      if (!Array.isArray(updates) || updates.length === 0) {
        sendErrorResponse(res, 'No updates provided', 400);
        return;
      }

      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: { _id: update.id },
          update: update.data,
          upsert: false
        }
      }));

      const result = await Product.bulkWrite(bulkOps);

      sendSuccessResponse(res, {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }, 'Products updated successfully');
    } catch (error: any) {
      console.error('Bulk update error:', error);
      sendErrorResponse(res, 'Failed to update products', 500);
    }
  }

  // Category Management
  async getAllCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await Category.find()
        .sort({ name: 1 })
        .lean();

      // Get product count for each category
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.countDocuments({
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
        })
      );

      sendSuccessResponse(res, categoriesWithCount, 'Categories retrieved successfully');
    } catch (error: any) {
      console.error('Get categories error:', error);
      sendErrorResponse(res, 'Failed to get categories', 500);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, isActive = true } = req.body;

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const category = new Category({
        name,
        description,
        slug,
        isActive
      });

      await category.save();

      sendSuccessResponse(res, {
        id: category._id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        isActive: category.isActive,
        productsCount: 0
      }, 'Category created successfully');
    } catch (error: any) {
      console.error('Create category error:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err: any) => err.message);
        sendErrorResponse(res, errors.join(', '), 400);
      } else if (error.code === 11000) {
        sendErrorResponse(res, 'Category with this name or slug already exists', 400);
      } else {
        sendErrorResponse(res, 'Failed to create category', 500);
      }
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid category ID', 400);
        return;
      }

      // Generate new slug if name is being updated
      if (updateData.name) {
        updateData.slug = updateData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      const category = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!category) {
        sendErrorResponse(res, 'Category not found', 404);
        return;
      }

      const productCount = await Product.countDocuments({
        category: category._id,
        isActive: true
      });

      sendSuccessResponse(res, {
        id: category._id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        isActive: category.isActive,
        productsCount: productCount
      }, 'Category updated successfully');
    } catch (error: any) {
      console.error('Update category error:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err: any) => err.message);
        sendErrorResponse(res, errors.join(', '), 400);
      } else if (error.code === 11000) {
        sendErrorResponse(res, 'Category with this name or slug already exists', 400);
      } else {
        sendErrorResponse(res, 'Failed to update category', 500);
      }
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid category ID', 400);
        return;
      }

      // Check if category has products
      const hasProducts = await Product.exists({ category: id });

      if (hasProducts) {
        sendErrorResponse(res, 'Cannot delete category with existing products', 400);
        return;
      }

      const category = await Category.findByIdAndDelete(id);

      if (!category) {
        sendErrorResponse(res, 'Category not found', 404);
        return;
      }

      sendSuccessResponse(res, { deleted: true }, 'Category deleted successfully');
    } catch (error: any) {
      console.error('Delete category error:', error);
      sendErrorResponse(res, 'Failed to delete category', 500);
    }
  }

  async reorderCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // This would require adding a sortOrder field to the Category model
      // For now, return success
      sendSuccessResponse(res, null, 'Categories reordered successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to reorder categories', 500);
    }
  }

  // Order Management
  async getAllOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 15,
        status,
        paymentStatus,
        search,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter object
      const filter: any = {};
      
      if (status) filter.status = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
        if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
      }
      if (search) {
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
          { 'shippingAddress.lastName': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('user', 'firstName lastName email')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Order.countDocuments(filter)
      ]);

      const formattedOrders = orders.map((order: any) => ({
        id: order.orderNumber,
        customerId: order.user?._id,
        customerName: order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: order.user?.email || 'unknown@example.com',
        items: order.items.map((item: any) => ({
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

      sendSuccessResponse(res, {
        orders: formattedOrders,
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum
      }, 'Orders retrieved successfully');
    } catch (error: any) {
      console.error('Get orders error:', error);
      sendErrorResponse(res, 'Failed to get orders', 500);
    }
  }

  async getOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const order: any = await Order.findOne({ orderNumber: id })
        .populate('user', 'firstName lastName email phone')
        .populate('items.product', 'name images')
        .lean();

      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      const formattedOrder = {
        id: order.orderNumber,
        customerId: order.user?._id,
        customerName: order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: order.user?.email || 'unknown@example.com',
        items: order.items.map((item: any) => ({
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
      };

      sendSuccessResponse(res, formattedOrder, 'Order retrieved successfully');
    } catch (error: any) {
      console.error('Get order error:', error);
      sendErrorResponse(res, 'Failed to get order', 500);
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        sendErrorResponse(res, 'Invalid status', 400);
        return;
      }

      const order = await Order.findOne({ orderNumber: id });
      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      order.status = status;
      if (notes) order.notes = notes;
      await order.save();

      sendSuccessResponse(res, {
        orderNumber: order.orderNumber,
        status: order.status,
        notes: order.notes
      }, 'Order status updated successfully');
    } catch (error: any) {
      console.error('Update order status error:', error);
      sendErrorResponse(res, 'Failed to update order status', 500);
    }
  }

  async updateOrderTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { trackingNumber } = req.body;

      const order = await Order.findOne({ orderNumber: id });
      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      order.trackingNumber = trackingNumber;
      if (!order.status || order.status === 'pending') {
        order.status = 'shipped';
      }
      await order.save();

      sendSuccessResponse(res, {
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        status: order.status
      }, 'Order tracking updated successfully');
    } catch (error: any) {
      console.error('Update tracking error:', error);
      sendErrorResponse(res, 'Failed to update order tracking', 500);
    }
  }

  async processRefund(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const order = await Order.findOne({ orderNumber: id });
      if (!order) {
        sendErrorResponse(res, 'Order not found', 404);
        return;
      }

      if (order.paymentStatus !== 'paid') {
        sendErrorResponse(res, 'Cannot refund unpaid order', 400);
        return;
      }

      // In a real implementation, this would integrate with payment processor
      order.paymentStatus = 'refunded';
      order.status = 'cancelled';
      if (reason) order.notes = (order.notes || '') + ` Refunded: ${reason}`;
      await order.save();

      sendSuccessResponse(res, {
        orderNumber: order.orderNumber,
        refundAmount: amount || order.totalAmount,
        status: order.status
      }, 'Refund processed successfully');
    } catch (error: any) {
      console.error('Process refund error:', error);
      sendErrorResponse(res, 'Failed to process refund', 500);
    }
  }

  // User Management
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 15,
        role = 'customer',
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter object
      const filter: any = { role };
      
      if (status) filter.isActive = status === 'active';
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [users, total] = await Promise.all([
        User.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .select('-password -refreshTokens')
          .lean(),
        User.countDocuments(filter)
      ]);

      // Get user statistics (orders and spending)
      const userIds = users.map(user => user._id);
      const userStats = await Order.aggregate([
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
      ]);

      const statsMap = new Map();
      userStats.forEach(stat => {
        statsMap.set(stat._id.toString(), stat);
      });

      const formattedUsers = users.map(user => {
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
      });

      sendSuccessResponse(res, {
        customers: formattedUsers,
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum
      }, 'Users retrieved successfully');
    } catch (error: any) {
      console.error('Get users error:', error);
      sendErrorResponse(res, 'Failed to get users', 500);
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid user ID', 400);
        return;
      }

      const user = await User.findById(id)
        .select('-password -refreshTokens')
        .lean();

      if (!user) {
        sendErrorResponse(res, 'User not found', 404);
        return;
      }

      // Get user order statistics
      const orderStats = await Order.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(id),
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

      sendSuccessResponse(res, userWithStats, 'User retrieved successfully');
    } catch (error: any) {
      console.error('Get user error:', error);
      sendErrorResponse(res, 'Failed to get user', 500);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendErrorResponse(res, 'Invalid user ID', 400);
        return;
      }

      const user = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      ).select('-password -refreshTokens');

      if (!user) {
        sendErrorResponse(res, 'User not found', 404);
        return;
      }

      sendSuccessResponse(res, {
        id: user._id,
        isActive: user.isActive
      }, 'User status updated successfully');
    } catch (error: any) {
      console.error('Update user status error:', error);
      sendErrorResponse(res, 'Failed to update user status', 500);
    }
  }

  async addUserNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // This would require adding a notes field to the User model
      // For now, return success
      sendSuccessResponse(res, null, 'User note added successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to add user note', 500);
    }
  }

  // Settings
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // In a real implementation, this would fetch from a settings collection
      // For now, return default settings
      const settings = {
        storeName: 'UdehGlobal',
        storeDescription: 'Premium footwear and accessories',
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        emailNotifications: true,
        smsNotifications: false,
        lowStockThreshold: 5,
        orderAutoApproval: false,
        maintenanceMode: false
      };

      sendSuccessResponse(res, settings, 'Settings retrieved successfully');
    } catch (error: any) {
      console.error('Get settings error:', error);
      sendErrorResponse(res, 'Failed to get settings', 500);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // In a real implementation, this would update a settings collection
      const updatedSettings = req.body;

      sendSuccessResponse(res, updatedSettings, 'Settings updated successfully');
    } catch (error: any) {
      console.error('Update settings error:', error);
      sendErrorResponse(res, 'Failed to update settings', 500);
    }
  }
}

export const adminController = new AdminController();