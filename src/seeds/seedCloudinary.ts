import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import dotenv from 'dotenv';
import path from 'path';
import { uploadFileToCloudinary } from '../config/cloudinary';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://nurudeeny17:Rich4ever@cluster0.gkcwpna.mongodb.net/udehglobal';
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected for seeding...');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Upload image to Cloudinary and return secure URL
const uploadImage = async (filename: string): Promise<string> => {
  try {
    const imagePath = path.join(process.cwd(), 'public', 'uploads', filename);
    console.log(`  📤 Uploading ${filename}...`);
    
    const result = await uploadFileToCloudinary(imagePath, {
      folder: 'udehglobal/products',
      filename: path.parse(filename).name,
    });

    console.log(`  ✅ ${filename} uploaded`);
    return result.secure_url;
  } catch (error: any) {
    console.error(`  ❌ Failed to upload ${filename}:`, error.message);
    throw error;
  }
};

const seedWithCloudinary = async () => {
  try {
    await connectDB();

    // Clear existing products to avoid duplicates
    console.log('\n🗑️  Clearing existing products...');
    const deletedCount = await Product.deleteMany({});
    console.log(`   Deleted ${deletedCount.deletedCount} existing products`);

    console.log('\n🔍 Checking categories...');
    
    // Create or get categories
    let artworkCategory = await Category.findOne({ slug: 'artwork' });
    let shoesCategory = await Category.findOne({ slug: 'shoes' });

    if (!artworkCategory) {
      artworkCategory = await Category.create({
        name: 'Artwork',
        slug: 'artwork',
        description: 'Beautiful artwork and wall decorations',
        iconName: 'Palette',
        displayOrder: 1,
        isActive: true,
      });
      console.log('✅ Created Artwork category');
    }

    if (!shoesCategory) {
      shoesCategory = await Category.create({
        name: 'Shoes',
        slug: 'shoes',
        description: 'Premium comfort slides and footwear',
        iconName: 'Footprints',
        displayOrder: 2,
        isActive: true,
      });
      console.log('✅ Created Shoes category');
    }

    // Upload artwork images
    console.log('\n📸 Uploading artwork images to Cloudinary...');
    const artworkImages: Record<string, string> = {};
    for (let i = 1; i <= 9; i++) {
      artworkImages[`artwork-${i}`] = await uploadImage(`artwork-${i}.jpg`);
    }

    // Upload shoe images
    console.log('\n👟 Uploading shoe images to Cloudinary...');
    const shoeImages: Record<string, string> = {};
    for (let i = 1; i <= 6; i++) {
      shoeImages[`product-${i}`] = await uploadImage(`product-${i}.jpg`);
    }

    // Create artwork products
    console.log('\n🎨 Creating artwork products...');
    const artworkProducts = [
      {
        category: artworkCategory._id,
        name: 'Modern Abstract Canvas Art',
        slug: 'modern-abstract-canvas-art-1',
        description: 'Contemporary abstract artwork perfect for modern interiors.',
        price: 45000,
        comparePrice: 60000,
        sku: 'ART-001',
        stockQuantity: 10,
        images: [{ url: artworkImages['artwork-1'], altText: 'Modern Abstract Canvas Art', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: true,
        tags: ['artwork', 'abstract', 'canvas', 'modern'],
      },
      {
        category: artworkCategory._id,
        name: 'Contemporary Wall Art Collection',
        slug: 'contemporary-wall-art-2',
        description: 'Stunning contemporary wall art that adds elegance to any room.',
        price: 42000,
        comparePrice: 55000,
        sku: 'ART-002',
        stockQuantity: 8,
        images: [{ url: artworkImages['artwork-2'], altText: 'Contemporary Wall Art', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: false,
        tags: ['artwork', 'contemporary', 'wall-art'],
      },
      {
        category: artworkCategory._id,
        name: 'Artistic Expression Canvas Print',
        slug: 'artistic-expression-canvas-3',
        description: 'Expressive artwork that brings life to your walls.',
        price: 48000,
        comparePrice: 62000,
        sku: 'ART-003',
        stockQuantity: 12,
        images: [{ url: artworkImages['artwork-3'], altText: 'Artistic Expression Canvas', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: true,
        tags: ['artwork', 'expression', 'canvas'],
      },
      {
        category: artworkCategory._id,
        name: 'Minimalist Art Print',
        slug: 'minimalist-art-print-4',
        description: 'Clean and sophisticated minimalist artwork.',
        price: 40000,
        comparePrice: 52000,
        sku: 'ART-004',
        stockQuantity: 15,
        images: [{ url: artworkImages['artwork-4'], altText: 'Minimalist Art Print', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: false,
        tags: ['artwork', 'minimalist', 'modern'],
      },
      {
        category: artworkCategory._id,
        name: 'Vibrant Abstract Wall Art',
        slug: 'vibrant-abstract-wall-art-5',
        description: 'Bold and vibrant abstract art that makes a statement.',
        price: 50000,
        comparePrice: 65000,
        sku: 'ART-005',
        stockQuantity: 9,
        images: [{ url: artworkImages['artwork-5'], altText: 'Vibrant Abstract Wall Art', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: true,
        tags: ['artwork', 'abstract', 'vibrant'],
      },
      {
        category: artworkCategory._id,
        name: 'Elegant Art Collection Piece',
        slug: 'elegant-art-collection-6',
        description: 'Elegant and timeless artwork for sophisticated spaces.',
        price: 46000,
        comparePrice: 58000,
        sku: 'ART-006',
        stockQuantity: 11,
        images: [{ url: artworkImages['artwork-6'], altText: 'Elegant Art Collection', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: false,
        tags: ['artwork', 'elegant', 'timeless'],
      },
      {
        category: artworkCategory._id,
        name: 'Modern Gallery Canvas Art',
        slug: 'modern-gallery-canvas-7',
        description: 'Gallery-quality modern canvas art.',
        price: 52000,
        comparePrice: 68000,
        sku: 'ART-007',
        stockQuantity: 7,
        images: [{ url: artworkImages['artwork-7'], altText: 'Modern Gallery Canvas', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: true,
        tags: ['artwork', 'modern', 'gallery'],
      },
      {
        category: artworkCategory._id,
        name: 'Contemporary Art Statement Piece',
        slug: 'contemporary-art-statement-8',
        description: 'Make a bold statement with this contemporary art piece.',
        price: 55000,
        comparePrice: 70000,
        sku: 'ART-008',
        stockQuantity: 6,
        images: [{ url: artworkImages['artwork-8'], altText: 'Contemporary Art Statement', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: false,
        tags: ['artwork', 'contemporary', 'statement'],
      },
      {
        category: artworkCategory._id,
        name: 'Abstract Expression Canvas',
        slug: 'abstract-expression-canvas-9',
        description: 'Stunning abstract expression artwork.',
        price: 49000,
        comparePrice: 63000,
        sku: 'ART-009',
        stockQuantity: 10,
        images: [{ url: artworkImages['artwork-9'], altText: 'Abstract Expression Canvas', displayOrder: 0, isPrimary: true }],
        isActive: true,
        isFeatured: true,
        tags: ['artwork', 'abstract', 'expression'],
      },
    ];

    await Product.insertMany(artworkProducts);
    console.log(`✅ Created ${artworkProducts.length} artwork products`);

    // Create shoe products
    console.log('\n👟 Creating shoe products...');
    const shoeProducts = [
      {
        category: shoesCategory._id,
        name: 'Premium Comfort Slides - Classic',
        slug: 'premium-comfort-slides-classic',
        description: 'Ultra-comfortable premium slides perfect for daily wear.',
        price: 25000,
        comparePrice: 32000,
        sku: 'SHOE-001',
        stockQuantity: 30,
        images: [{ url: shoeImages['product-1'], altText: 'Premium Comfort Slides', displayOrder: 0, isPrimary: true }],
        variants: [
          { variantType: 'size', variantValue: '38', priceAdjustment: 0, stockQuantity: 6, sku: 'SHOE-001-38' },
          { variantType: 'size', variantValue: '40', priceAdjustment: 0, stockQuantity: 8, sku: 'SHOE-001-40' },
          { variantType: 'size', variantValue: '42', priceAdjustment: 0, stockQuantity: 8, sku: 'SHOE-001-42' },
          { variantType: 'size', variantValue: '44', priceAdjustment: 0, stockQuantity: 8, sku: 'SHOE-001-44' },
        ],
        isActive: true,
        isFeatured: true,
        tags: ['shoes', 'slides', 'comfort'],
      },
      {
        category: shoesCategory._id,
        name: 'Designer Comfort Slides',
        slug: 'designer-comfort-slides',
        description: 'Stylish designer slides with premium materials.',
        price: 28000,
        comparePrice: 35000,
        sku: 'SHOE-002',
        stockQuantity: 25,
        images: [{ url: shoeImages['product-2'], altText: 'Designer Comfort Slides', displayOrder: 0, isPrimary: true }],
        variants: [
          { variantType: 'size', variantValue: '38', priceAdjustment: 0, stockQuantity: 5, sku: 'SHOE-002-38' },
          { variantType: 'size', variantValue: '40', priceAdjustment: 0, stockQuantity: 7, sku: 'SHOE-002-40' },
          { variantType: 'size', variantValue: '42', priceAdjustment: 0, stockQuantity: 7, sku: 'SHOE-002-42' },
          { variantType: 'size', variantValue: '44', priceAdjustment: 0, stockQuantity: 6, sku: 'SHOE-002-44' },
        ],
        isActive: true,
        isFeatured: true,
        tags: ['shoes', 'slides', 'designer'],
      },
      {
        category: shoesCategory._id,
        name: 'Ultra Soft Comfort Slides',
        slug: 'ultra-soft-comfort-slides',
        description: 'Experience cloud-like comfort with our ultra-soft slides.',
        price: 24000,
        comparePrice: 30000,
        sku: 'SHOE-003',
        stockQuantity: 35,
        images: [{ url: shoeImages['product-3'], altText: 'Ultra Soft Comfort Slides', displayOrder: 0, isPrimary: true }],
        variants: [
          { variantType: 'size', variantValue: '38', priceAdjustment: 0, stockQuantity: 7, sku: 'SHOE-003-38' },
          { variantType: 'size', variantValue: '40', priceAdjustment: 0, stockQuantity: 9, sku: 'SHOE-003-40' },
          { variantType: 'size', variantValue: '42', priceAdjustment: 0, stockQuantity: 10, sku: 'SHOE-003-42' },
          { variantType: 'size', variantValue: '44', priceAdjustment: 0, stockQuantity: 9, sku: 'SHOE-003-44' },
        ],
        isActive: true,
        isFeatured: false,
        tags: ['shoes', 'slides', 'soft'],
      },
      {
        category: shoesCategory._id,
        name: 'Sport Comfort Slides',
        slug: 'sport-comfort-slides',
        description: 'Athletic-inspired slides with superior grip and support.',
        price: 27000,
        comparePrice: 34000,
        sku: 'SHOE-004',
        stockQuantity: 28,
        images: [{ url: shoeImages['product-4'], altText: 'Sport Comfort Slides', displayOrder: 0, isPrimary: true }],
        variants: [
          { variantType: 'size', variantValue: '38', priceAdjustment: 0, stockQuantity: 6, sku: 'SHOE-004-38' },
          { variantType: 'size', variantValue: '40', priceAdjustment: 0, stockQuantity: 7, sku: 'SHOE-004-40' },
          { variantType: 'size', variantValue: '42', priceAdjustment: 0, stockQuantity: 8, sku: 'SHOE-004-42' },
          { variantType: 'size', variantValue: '44', priceAdjustment: 0, stockQuantity: 7, sku: 'SHOE-004-44' },
        ],
        isActive: true,
        isFeatured: true,
        tags: ['shoes', 'slides', 'sport'],
      },
      {
        category: shoesCategory._id,
        name: 'Luxury Comfort Slides',
        slug: 'luxury-comfort-slides',
        description: 'Premium luxury slides crafted with finest materials.',
        price: 32000,
        comparePrice: 40000,
        sku: 'SHOE-005',
        stockQuantity: 20,
        images: [{ url: shoeImages['product-5'], altText: 'Luxury Comfort Slides', displayOrder: 0, isPrimary: true }],
        variants: [
          { variantType: 'size', variantValue: '38', priceAdjustment: 0, stockQuantity: 4, sku: 'SHOE-005-38' },
          { variantType: 'size', variantValue: '40', priceAdjustment: 0, stockQuantity: 5, sku: 'SHOE-005-40' },
          { variantType: 'size', variantValue: '42', priceAdjustment: 0, stockQuantity: 6, sku: 'SHOE-005-42' },
          { variantType: 'size', variantValue: '44', priceAdjustment: 0, stockQuantity: 5, sku: 'SHOE-005-44' },
        ],
        isActive: true,
        isFeatured: true,
        tags: ['shoes', 'slides', 'luxury'],
      },
      {
        category: shoesCategory._id,
        name: 'Essential Comfort Slides',
        slug: 'essential-comfort-slides',
        description: 'Everyday essential slides with reliable comfort and durability.',
        price: 22000,
        comparePrice: 28000,
        sku: 'SHOE-006',
        stockQuantity: 40,
        images: [{ url: shoeImages['product-6'], altText: 'Essential Comfort Slides', displayOrder: 0, isPrimary: true }],
        variants: [
          { variantType: 'size', variantValue: '38', priceAdjustment: 0, stockQuantity: 8, sku: 'SHOE-006-38' },
          { variantType: 'size', variantValue: '40', priceAdjustment: 0, stockQuantity: 10, sku: 'SHOE-006-40' },
          { variantType: 'size', variantValue: '42', priceAdjustment: 0, stockQuantity: 12, sku: 'SHOE-006-42' },
          { variantType: 'size', variantValue: '44', priceAdjustment: 0, stockQuantity: 10, sku: 'SHOE-006-44' },
        ],
        isActive: true,
        isFeatured: false,
        tags: ['shoes', 'slides', 'essential'],
      },
    ];

    await Product.insertMany(shoeProducts);
    console.log(`✅ Created ${shoeProducts.length} shoe products`);

    console.log('\n🎉 Cloudinary seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - 2 Categories`);
    console.log(`   - ${artworkProducts.length} Artwork products`);
    console.log(`   - ${shoeProducts.length} Shoe products`);
    console.log(`   - All images hosted on Cloudinary ☁️`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

// Run
seedWithCloudinary();
