"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateImagesToCloudinary = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("../config/cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const migrateImagesToCloudinary = async (imagesDir, folderName = 'udehglobal/products') => {
    const results = [];
    try {
        if (!fs_1.default.existsSync(imagesDir)) {
            console.error(`Directory not found: ${imagesDir}`);
            return results;
        }
        const files = fs_1.default.readdirSync(imagesDir).filter(file => {
            const ext = path_1.default.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
        });
        console.log(`Found ${files.length} images to upload...`);
        for (const file of files) {
            const filePath = path_1.default.join(imagesDir, file);
            const fileNameWithoutExt = path_1.default.parse(file).name;
            try {
                console.log(`Uploading ${file}...`);
                const uploadResult = await (0, cloudinary_1.uploadFileToCloudinary)(filePath, {
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
            }
            catch (error) {
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
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`\n📊 Migration Summary:`);
        console.log(`   Total: ${results.length}`);
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   ❌ Failed: ${failed}`);
        return results;
    }
    catch (error) {
        console.error('Error during migration:', error);
        return results;
    }
};
exports.migrateImagesToCloudinary = migrateImagesToCloudinary;
const runMigration = async () => {
    console.log('🚀 Starting image migration to Cloudinary...\n');
    const uploadsDir = path_1.default.join(process.cwd(), 'public', 'uploads');
    console.log('📸 Migrating product images...');
    const productResults = await (0, exports.migrateImagesToCloudinary)(uploadsDir, 'udehglobal/products');
    const mappingPath = path_1.default.join(process.cwd(), 'cloudinary-migration-mapping.json');
    fs_1.default.writeFileSync(mappingPath, JSON.stringify(productResults, null, 2));
    console.log(`\n💾 Migration mapping saved to: ${mappingPath}`);
    console.log('   Use this file to update database URLs if needed.\n');
    process.exit(0);
};
if (require.main === module) {
    runMigration();
}
exports.default = exports.migrateImagesToCloudinary;
