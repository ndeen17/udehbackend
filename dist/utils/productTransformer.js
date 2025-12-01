"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformCategory = exports.transformProducts = exports.transformProduct = exports.transformImageUrl = void 0;
const getBackendBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        return process.env.BACKEND_URL || 'https://udehbackend.onrender.com';
    }
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}`;
};
const transformImageUrl = (relativeUrl) => {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl;
    }
    const baseUrl = getBackendBaseUrl();
    const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
    return `${baseUrl}/${cleanUrl}`;
};
exports.transformImageUrl = transformImageUrl;
const transformProduct = (product) => {
    if (!product)
        return null;
    const productObj = product.toObject ? product.toObject() : product;
    if (productObj.images && Array.isArray(productObj.images)) {
        productObj.images = productObj.images.map((image) => ({
            ...image,
            url: (0, exports.transformImageUrl)(image.url)
        }));
    }
    return productObj;
};
exports.transformProduct = transformProduct;
const transformProducts = (products) => {
    return products.map(exports.transformProduct);
};
exports.transformProducts = transformProducts;
const transformCategory = (category) => {
    if (!category)
        return null;
    const categoryObj = category.toObject ? category.toObject() : category;
    if (categoryObj.image) {
        categoryObj.image = (0, exports.transformImageUrl)(categoryObj.image);
    }
    return categoryObj;
};
exports.transformCategory = transformCategory;
exports.default = {
    transformProduct: exports.transformProduct,
    transformProducts: exports.transformProducts,
    transformCategory: exports.transformCategory,
    transformImageUrl: exports.transformImageUrl
};
