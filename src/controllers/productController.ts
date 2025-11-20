import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { transformProducts, transformProduct } from '../utils/productTransformer';
import mongoose from 'mongoose';

class ProductController {
  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = req.query.sortBy as string || 'name';
      const category = req.query.category as string;
      const search = req.query.search as string;
      const priceMin = parseFloat(req.query.priceMin as string);
      const priceMax = parseFloat(req.query.priceMax as string);
      const inStock = req.query.inStock === 'true';

      // Build query
      const query: any = { isActive: true };

      // Add category filter
      if (category) {
        const categoryDoc = await Category.findOne({ slug: category });
        if (categoryDoc) {
          query.category = categoryDoc._id;
        }
      }

      // Add search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Add price filter
      if (!isNaN(priceMin) && !isNaN(priceMax)) {
        query.price = { $gte: priceMin, $lte: priceMax };
      } else if (!isNaN(priceMin)) {
        query.price = { $gte: priceMin };
      } else if (!isNaN(priceMax)) {
        query.price = { $lte: priceMax };
      }

      // Add stock filter
      if (inStock) {
        query.stockQuantity = { $gt: 0 };
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
        products: transformProducts(products),
        total,
        pages,
        currentPage: page,
        hasNext: page < pages,
        hasPrev: page > 1
      };

      sendSuccessResponse(res, responseData, 'Products retrieved successfully');
    } catch (error: any) {
      console.error('Get products error:', error);
      sendErrorResponse(res, 'Failed to get products', 500);
    }
  }

  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = req.query.sortBy as string || 'relevance';
      
      // Advanced filters
      const category = req.query.category as string;
      const minPrice = parseFloat(req.query.minPrice as string);
      const maxPrice = parseFloat(req.query.maxPrice as string);
      const minRating = parseFloat(req.query.minRating as string);
      const inStock = req.query.inStock === 'true';

      if (!query) {
        sendErrorResponse(res, 'Search query is required', 400);
        return;
      }

      // Build search query with text search for better relevance
      const searchQuery: any = {
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      };

      // Apply filters
      if (category) {
        const categoryDoc = await Category.findOne({ slug: category });
        if (categoryDoc) {
          searchQuery.category = categoryDoc._id;
        }
      }

      if (!isNaN(minPrice) || !isNaN(maxPrice)) {
        searchQuery.price = {};
        if (!isNaN(minPrice)) searchQuery.price.$gte = minPrice;
        if (!isNaN(maxPrice)) searchQuery.price.$lte = maxPrice;
      }

      if (!isNaN(minRating)) {
        searchQuery.averageRating = { $gte: minRating };
      }

      if (inStock) {
        searchQuery.stock = { $gt: 0 };
      }

      // Determine sort order
      let sortOptions: any = {};
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
        default: // relevance
          // Calculate relevance score based on match position
          sortOptions = { name: 1 };
      }

      // Get products with pagination
      const [products, total] = await Promise.all([
        Product.find(searchQuery)
          .populate('category', 'name slug')
          .sort(sortOptions)
          .limit(limit)
          .skip((page - 1) * limit)
          .lean(),
        Product.countDocuments(searchQuery)
      ]);

      const pages = Math.ceil(total / limit);

      // Get available filters for refinement
      const [categories, priceRange] = await Promise.all([
        Product.distinct('category', { ...searchQuery, category: { $exists: true } })
          .then(ids => Category.find({ _id: { $in: ids } }, 'name slug').lean()),
        Product.aggregate([
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
        products: transformProducts(products),
        total,
        pages,
        currentPage: page,
        query,
        filters: {
          categories: categories || [],
          priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
        }
      };

      sendSuccessResponse(res, responseData, 'Search completed successfully');
    } catch (error: any) {
      console.error('Search error:', error);
      sendErrorResponse(res, 'Search failed', 500);
    }
  }

  // Get search suggestions/autocomplete
  async getSearchSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || query.length < 2) {
        sendSuccessResponse(res, { suggestions: [] }, 'Suggestions retrieved');
        return;
      }

      // Get product name suggestions
      const productSuggestions = await Product.find({
        isActive: true,
        name: { $regex: query, $options: 'i' }
      })
        .select('name')
        .limit(limit)
        .lean();

      // Get category suggestions
      const categorySuggestions = await Category.find({
        name: { $regex: query, $options: 'i' }
      })
        .select('name slug')
        .limit(5)
        .lean();

      // Get tag suggestions
      const tagSuggestions = await Product.aggregate([
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

      sendSuccessResponse(res, suggestions, 'Suggestions retrieved successfully');
    } catch (error: any) {
      console.error('Suggestions error:', error);
      sendErrorResponse(res, 'Failed to get suggestions', 500);
    }
  }

  async getFeaturedProducts(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 8;

      const products = await Product.find({ 
        isActive: true, 
        isFeatured: true 
      })
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      sendSuccessResponse(res, transformProducts(products), 'Featured products retrieved successfully');
    } catch (error: any) {
      console.error('Get featured products error:', error);
      sendErrorResponse(res, 'Failed to get featured products', 500);
    }
  }

  async getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({ slug, isActive: true })
        .populate('category', 'name slug')
        .lean();

      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      sendSuccessResponse(res, transformProduct(product), 'Product retrieved successfully');
    } catch (error: any) {
      console.error('Get product error:', error);
      sendErrorResponse(res, 'Failed to get product', 500);
    }
  }

  async getProductVariants(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({ slug, isActive: true })
        .select('variants')
        .lean();

      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      sendSuccessResponse(res, product.variants || [], 'Product variants retrieved successfully');
    } catch (error: any) {
      console.error('Get product variants error:', error);
      sendErrorResponse(res, 'Failed to get product variants', 500);
    }
  }

  async getProductReviews(req: Request, res: Response): Promise<void> {
    try {
      // For now, return empty array as we haven't implemented reviews yet
      sendSuccessResponse(res, [], 'Product reviews retrieved successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to get product reviews', 500);
    }
  }

  async addProductReview(req: Request, res: Response): Promise<void> {
    try {
      // For now, return success as we haven't implemented reviews yet
      sendSuccessResponse(res, null, 'Review added successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to add review', 500);
    }
  }

  async getRelatedProducts(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const limit = parseInt(req.query.limit as string) || 4;

      const product = await Product.findOne({ slug, isActive: true });
      if (!product) {
        sendErrorResponse(res, 'Product not found', 404);
        return;
      }

      // Get related products from same category
      const relatedProducts = await Product.find({
        _id: { $ne: product._id },
        category: product.category,
        isActive: true
      })
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      sendSuccessResponse(res, transformProducts(relatedProducts), 'Related products retrieved successfully');
    } catch (error: any) {
      console.error('Get related products error:', error);
      sendErrorResponse(res, 'Failed to get related products', 500);
    }
  }
}

export const productController = new ProductController();