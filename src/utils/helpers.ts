import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const sendSuccessResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendErrorResponse = (
  res: Response,
  error: string,
  statusCode: number = 400,
  validationErrors?: any[]
): Response<ApiResponse> => {
  return res.status(statusCode).json({
    success: false,
    message: 'Error',
    error,
    ...(validationErrors && { validationErrors })
  });
};

export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message: string = 'Success',
  statusCode: number = 200
): Response<ApiResponse<T[]>> => {
  const pages = Math.ceil(pagination.total / pagination.limit);
  
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      ...pagination,
      pages,
    },
  });
};

export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

export const generateSKU = (productName: string, category?: string): string => {
  const nameSlug = productName.substring(0, 4).toUpperCase();
  const categorySlug = category ? category.substring(0, 2).toUpperCase() : 'GN';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${categorySlug}-${nameSlug}-${timestamp}${random}`;
};

export const formatPrice = (price: number, currency: string = '₦'): string => {
  return `${currency}${price.toLocaleString()}`;
};

export const calculateDiscountPercentage = (originalPrice: number, salePrice: number): number => {
  if (originalPrice <= salePrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};