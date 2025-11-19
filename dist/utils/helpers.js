"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDiscountPercentage = exports.formatPrice = exports.generateSKU = exports.createSlug = exports.sendPaginatedResponse = exports.sendErrorResponse = exports.sendSuccessResponse = void 0;
const sendSuccessResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};
exports.sendSuccessResponse = sendSuccessResponse;
const sendErrorResponse = (res, error, statusCode = 400, validationErrors) => {
    return res.status(statusCode).json({
        success: false,
        message: 'Error',
        error,
        ...(validationErrors && { validationErrors })
    });
};
exports.sendErrorResponse = sendErrorResponse;
const sendPaginatedResponse = (res, data, pagination, message = 'Success', statusCode = 200) => {
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
exports.sendPaginatedResponse = sendPaginatedResponse;
const createSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};
exports.createSlug = createSlug;
const generateSKU = (productName, category) => {
    const nameSlug = productName.substring(0, 4).toUpperCase();
    const categorySlug = category ? category.substring(0, 2).toUpperCase() : 'GN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${categorySlug}-${nameSlug}-${timestamp}${random}`;
};
exports.generateSKU = generateSKU;
const formatPrice = (price, currency = '₦') => {
    return `${currency}${price.toLocaleString()}`;
};
exports.formatPrice = formatPrice;
const calculateDiscountPercentage = (originalPrice, salePrice) => {
    if (originalPrice <= salePrice)
        return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};
exports.calculateDiscountPercentage = calculateDiscountPercentage;
