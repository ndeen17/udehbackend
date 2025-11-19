import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${random}${extension}`;
    cb(null, filename);
  }
});

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

// Helper function to get image URL from filename
export const getImageUrl = (filename: string): string => {
  return `/uploads/products/${filename}`;
};

// Helper function to delete image file
export const deleteImageFile = (filename: string): void => {
  try {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
};

export default upload;