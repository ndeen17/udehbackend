/**
 * Product Data Transformer
 * Transforms product data to include full image URLs for frontend consumption
 */

import { IProduct } from '../models/Product';

/**
 * Get the base URL for the backend
 * Works for both development and production
 */
const getBackendBaseUrl = (): string => {
  // In production, use the deployed backend URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL || 'https://udehbackend.onrender.com';
  }
  
  // In development, construct from PORT
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

/**
 * Transform a relative image URL to an absolute URL
 */
export const transformImageUrl = (relativeUrl: string): string => {
  // If already a full URL, return as is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  const baseUrl = getBackendBaseUrl();
  
  // Remove leading slash if present to avoid double slashes
  const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
  
  return `${baseUrl}/${cleanUrl}`;
};

/**
 * Transform a product object to include full image URLs
 */
export const transformProduct = (product: any): any => {
  if (!product) return null;
  
  // Convert to plain object if it's a Mongoose document
  const productObj = product.toObject ? product.toObject() : product;
  
  // Transform image URLs
  if (productObj.images && Array.isArray(productObj.images)) {
    productObj.images = productObj.images.map((image: any) => ({
      ...image,
      url: transformImageUrl(image.url)
    }));
  }
  
  return productObj;
};

/**
 * Transform an array of products
 */
export const transformProducts = (products: any[]): any[] => {
  return products.map(transformProduct);
};

/**
 * Transform category data (if it has images in the future)
 */
export const transformCategory = (category: any): any => {
  if (!category) return null;
  
  const categoryObj = category.toObject ? category.toObject() : category;
  
  // If category has image field in the future, transform it here
  if (categoryObj.image) {
    categoryObj.image = transformImageUrl(categoryObj.image);
  }
  
  return categoryObj;
};

export default {
  transformProduct,
  transformProducts,
  transformCategory,
  transformImageUrl
};
