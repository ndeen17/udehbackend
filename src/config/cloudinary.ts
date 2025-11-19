import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration on startup
export const verifyCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || !api_key || !api_secret) {
    console.warn('⚠️  Cloudinary credentials missing. Image uploads will fail.');
    console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    return false;
  }
  
  console.log('✅ Cloudinary configured successfully');
  console.log(`   Cloud Name: ${cloud_name}`);
  return true;
};

// Upload image buffer to Cloudinary
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  options: {
    folder?: string;
    filename?: string;
    transformation?: any;
  } = {}
): Promise<{ url: string; publicId: string; secure_url: string }> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
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

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          resolve({
            url: result.url,
            secure_url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Upload image from file path to Cloudinary (for seed scripts)
export const uploadFileToCloudinary = async (
  filePath: string,
  options: {
    folder?: string;
    filename?: string;
  } = {}
): Promise<{ url: string; publicId: string; secure_url: string }> => {
  try {
    const uploadOptions: any = {
      folder: options.folder || 'udehglobal/products',
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    };

    if (options.filename) {
      uploadOptions.public_id = options.filename;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      url: result.url,
      secure_url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary file upload error:', error);
    throw error;
  }
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicId = (cloudinaryUrl: string): string | null => {
  try {
    // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/filename.jpg
    const matches = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Generate optimized image URL with transformations
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string => {
  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);

  const transformString = transformations.length > 0 ? transformations.join(',') : '';
  
  return cloudinary.url(publicId, {
    transformation: transformString,
    secure: true,
  });
};

export default cloudinary;
