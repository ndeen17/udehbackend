"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptimizedImageUrl = exports.extractPublicId = exports.deleteFromCloudinary = exports.uploadFileToCloudinary = exports.uploadToCloudinary = exports.verifyCloudinaryConfig = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const verifyCloudinaryConfig = () => {
    const { cloud_name, api_key, api_secret } = cloudinary_1.v2.config();
    if (!cloud_name || !api_key || !api_secret) {
        console.warn('⚠️  Cloudinary credentials missing. Image uploads will fail.');
        console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        return false;
    }
    console.log('✅ Cloudinary configured successfully');
    console.log(`   Cloud Name: ${cloud_name}`);
    return true;
};
exports.verifyCloudinaryConfig = verifyCloudinaryConfig;
const uploadToCloudinary = async (fileBuffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || 'udehglobal/products',
            resource_type: 'auto',
            quality: 'auto:good',
            fetch_format: 'auto',
        };
        if (options.filename) {
            uploadOptions.public_id = options.filename;
        }
        if (options.transformation) {
            uploadOptions.transformation = options.transformation;
        }
        const uploadStream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
            }
            else if (result) {
                resolve({
                    url: result.url,
                    secure_url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        });
        uploadStream.end(fileBuffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const uploadFileToCloudinary = async (filePath, options = {}) => {
    try {
        const uploadOptions = {
            folder: options.folder || 'udehglobal/products',
            resource_type: 'auto',
            quality: 'auto:good',
            fetch_format: 'auto',
        };
        if (options.filename) {
            uploadOptions.public_id = options.filename;
        }
        const result = await cloudinary_1.v2.uploader.upload(filePath, uploadOptions);
        return {
            url: result.url,
            secure_url: result.secure_url,
            publicId: result.public_id,
        };
    }
    catch (error) {
        console.error('Cloudinary file upload error:', error);
        throw error;
    }
};
exports.uploadFileToCloudinary = uploadFileToCloudinary;
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        return result.result === 'ok';
    }
    catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
const extractPublicId = (cloudinaryUrl) => {
    try {
        const matches = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
        return matches ? matches[1] : null;
    }
    catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};
exports.extractPublicId = extractPublicId;
const getOptimizedImageUrl = (publicId, options = {}) => {
    const transformations = [];
    if (options.width)
        transformations.push(`w_${options.width}`);
    if (options.height)
        transformations.push(`h_${options.height}`);
    if (options.crop)
        transformations.push(`c_${options.crop}`);
    if (options.quality)
        transformations.push(`q_${options.quality}`);
    if (options.format)
        transformations.push(`f_${options.format}`);
    const transformString = transformations.length > 0 ? transformations.join(',') : '';
    return cloudinary_1.v2.url(publicId, {
        transformation: transformString,
        secure: true,
    });
};
exports.getOptimizedImageUrl = getOptimizedImageUrl;
exports.default = cloudinary_1.v2;
