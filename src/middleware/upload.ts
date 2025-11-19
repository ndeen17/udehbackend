import multer from 'multer';
import path from 'path';

// Configure multer to use memory storage (for Cloudinary uploads)
// Files will be stored in memory as Buffer objects
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: any, file: any, cb: any) => {
  // Check file type
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter
});

// Middleware for single image upload
export const uploadSingle = upload.single('image');

// Middleware for multiple image uploads
export const uploadMultiple = upload.array('images', 10);

// Middleware for product images with multiple fields
export const uploadProductImages = upload.fields([
  { name: 'primaryImage', maxCount: 1 },
  { name: 'additionalImages', maxCount: 9 }
]);

// Note: Image URLs are now handled by Cloudinary
// The uploadToCloudinary function in config/cloudinary.ts will return the full Cloudinary URL
// No need for getImageUrl or deleteImageFile helpers here - those are in cloudinary.ts

export default upload;