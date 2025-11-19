import path from 'path';
import fs from 'fs';
import { uploadFileToCloudinary } from '../config/cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration utility to upload existing local images to Cloudinary
 * This will help migrate artwork and product images from local storage
 */

interface ImageUploadResult {
  localPath: string;
  cloudinaryUrl: string;
  publicId: string;
  success: boolean;
  error?: string;
}

export const migrateImagesToCloudinary = async (
  imagesDir: string,
  folderName: string = 'udehglobal/products'
): Promise<ImageUploadResult[]> => {
  const results: ImageUploadResult[] = [];

  try {
    // Check if directory exists
    if (!fs.existsSync(imagesDir)) {
      console.error(`Directory not found: ${imagesDir}`);
      return results;
    }

    // Get all image files
    const files = fs.readdirSync(imagesDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    });

    console.log(`Found ${files.length} images to upload...`);

    // Upload each file
    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      const fileNameWithoutExt = path.parse(file).name;

      try {
        console.log(`Uploading ${file}...`);
        
        const uploadResult = await uploadFileToCloudinary(filePath, {
          folder: folderName,
          filename: fileNameWithoutExt,
        });

        results.push({
          localPath: filePath,
          cloudinaryUrl: uploadResult.secure_url,
          publicId: uploadResult.publicId,
          success: true,
        });

        console.log(`✅ Uploaded: ${file} -> ${uploadResult.secure_url}`);
      } catch (error: any) {
        console.error(`❌ Failed to upload ${file}:`, error.message);
        
        results.push({
          localPath: filePath,
          cloudinaryUrl: '',
          publicId: '',
          success: false,
          error: error.message,
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total: ${results.length}`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    return results;
  } catch (error) {
    console.error('Error during migration:', error);
    return results;
  }
};

// Standalone migration script
const runMigration = async () => {
  console.log('🚀 Starting image migration to Cloudinary...\n');

  // Migrate product images
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  
  console.log('📸 Migrating product images...');
  const productResults = await migrateImagesToCloudinary(
    uploadsDir,
    'udehglobal/products'
  );

  // Create a mapping file for reference
  const mappingPath = path.join(process.cwd(), 'cloudinary-migration-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(productResults, null, 2));
  
  console.log(`\n💾 Migration mapping saved to: ${mappingPath}`);
  console.log('   Use this file to update database URLs if needed.\n');

  process.exit(0);
};

// Run if executed directly
if (require.main === module) {
  runMigration();
}

export default migrateImagesToCloudinary;
