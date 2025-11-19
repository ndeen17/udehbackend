import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://nurudeeny17:Rich4ever@cluster0.gkcwpna.mongodb.net/udehglobal');
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Categories data - General business categories with proper frontend icons
const categoriesData = [
  {
    name: 'Clothing & Apparel',
    slug: 'clothing-apparel',
    description: 'Latest fashion trends, casual wear, formal attire, and seasonal collections',
    iconName: 'Shirt',
    displayOrder: 1,
    isActive: true
  },
  {
    name: 'Electronics & Tech',
    slug: 'electronics-tech',
    description: 'Smartphones, laptops, gadgets, and cutting-edge technology',
    iconName: 'Smartphone',
    displayOrder: 2,
    isActive: true
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Home decor, furniture, kitchen essentials, and lifestyle products',
    iconName: 'Home',
    displayOrder: 3,
    isActive: true
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Skincare, cosmetics, fragrances, and personal wellness products',
    iconName: 'Sparkles',
    displayOrder: 4,
    isActive: true
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Athletic wear, gym equipment, outdoor gear, and fitness accessories',
    iconName: 'Dumbbell',
    displayOrder: 5,
    isActive: true
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Car accessories, auto parts, maintenance tools, and vehicle upgrades',
    iconName: 'Car',
    displayOrder: 6,
    isActive: true
  },
  {
    name: 'Books & Education',
    slug: 'books-education',
    description: 'Educational materials, literature, learning resources, and stationery',
    iconName: 'BookOpen',
    displayOrder: 7,
    isActive: true
  },
  {
    name: 'Tools & Hardware',
    slug: 'tools-hardware',
    description: 'Professional tools, hardware supplies, DIY equipment, and workshop essentials',
    iconName: 'Hammer',
    displayOrder: 8,
    isActive: true
  }
];

// Sample products data (will be populated after categories are created)
const createProductsData = (categoryIds: any) => [
  {
    category: categoryIds.clothing,
    name: 'Premium Cotton T-Shirt',
    slug: 'premium-cotton-t-shirt',
    description: 'High-quality 100% cotton t-shirt with comfortable fit and durable construction. Perfect for casual wear.',
    price: 15000,
    comparePrice: 20000,
    sku: 'TSHIRT-COTTON-001',
    stockQuantity: 50,
    images: [
      {
        url: '/images/products/cotton-tshirt-main.jpg',
        altText: 'Premium Cotton T-Shirt - Main View',
        displayOrder: 0,
        isPrimary: true
      }
    ],
    variants: [
      {
        variantType: 'size',
        variantValue: 'M',
        priceAdjustment: 0,
        stockQuantity: 15,
        sku: 'TSHIRT-COTTON-001-M'
      },
      {
        variantType: 'size',
        variantValue: 'L',
        priceAdjustment: 0,
        stockQuantity: 20,
        sku: 'TSHIRT-COTTON-001-L'
      },
      {
        variantType: 'size',
        variantValue: 'XL',
        priceAdjustment: 0,
        stockQuantity: 15,
        sku: 'TSHIRT-COTTON-001-XL'
      }
    ],
    isActive: true,
    isFeatured: true,
    tags: ['clothing', 'casual', 'cotton', 'comfortable'],
    seoTitle: 'Premium Cotton T-Shirt - Comfortable Casual Wear',
    seoDescription: 'Shop premium cotton t-shirts. High-quality materials with comfortable fit perfect for everyday wear.'
  },
  {
    category: categoryIds.electronics,
    name: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    description: 'Premium wireless Bluetooth headphones with noise cancellation and superior sound quality.',
    price: 85000,
    comparePrice: 100000,
    sku: 'HEADPHONES-BT-001',
    stockQuantity: 30,
    images: [
      {
        url: '/images/products/bluetooth-headphones-main.jpg',
        altText: 'Wireless Bluetooth Headphones - Main View',
        displayOrder: 0,
        isPrimary: true
      }
    ],
    variants: [
      {
        variantType: 'color',
        variantValue: 'Black',
        priceAdjustment: 0,
        stockQuantity: 15,
        sku: 'HEADPHONES-BT-001-BLK'
      },
      {
        variantType: 'color',
        variantValue: 'White',
        priceAdjustment: 0,
        stockQuantity: 15,
        sku: 'HEADPHONES-BT-001-WHT'
      }
    ],
    isActive: true,
    isFeatured: true,
    tags: ['electronics', 'audio', 'wireless', 'bluetooth'],
    seoTitle: 'Wireless Bluetooth Headphones - Premium Audio',
    seoDescription: 'Shop premium wireless Bluetooth headphones with noise cancellation and superior sound quality.'
  },
  {
    category: categoryIds.home,
    name: 'Modern Table Lamp',
    slug: 'modern-table-lamp',
    description: 'Elegant modern table lamp with LED lighting and adjustable brightness. Perfect for home or office.',
    price: 45000,
    comparePrice: 55000,
    sku: 'LAMP-TABLE-001',
    stockQuantity: 25,
    images: [
      {
        url: '/images/products/table-lamp-main.jpg',
        altText: 'Modern Table Lamp - Main View',
        displayOrder: 0,
        isPrimary: true
      }
    ],
    variants: [
      {
        variantType: 'style',
        variantValue: 'Brass',
        priceAdjustment: 0,
        stockQuantity: 12,
        sku: 'LAMP-TABLE-001-BRASS'
      },
      {
        variantType: 'style',
        variantValue: 'Chrome',
        priceAdjustment: 0,
        stockQuantity: 13,
        sku: 'LAMP-TABLE-001-CHROME'
      }
    ],
    isActive: true,
    isFeatured: false,
    tags: ['home', 'lighting', 'modern', 'led'],
    seoTitle: 'Modern LED Table Lamp - Home Lighting',
    seoDescription: 'Elegant modern table lamp with LED lighting and adjustable brightness for home or office use.'
  },
  {
    category: categoryIds.beauty,
    name: 'Organic Skincare Set',
    slug: 'organic-skincare-set',
    description: 'Complete organic skincare set with cleanser, moisturizer, and serum. Made with natural ingredients.',
    price: 65000,
    sku: 'SKINCARE-ORG-001',
    stockQuantity: 20,
    images: [
      {
        url: '/images/products/skincare-set-main.jpg',
        altText: 'Organic Skincare Set - Main View',
        displayOrder: 0,
        isPrimary: true
      }
    ],
    variants: [
      {
        variantType: 'style',
        variantValue: 'Dry Skin',
        priceAdjustment: 0,
        stockQuantity: 10,
        sku: 'SKINCARE-ORG-001-DRY'
      },
      {
        variantType: 'style',
        variantValue: 'Oily Skin',
        priceAdjustment: 0,
        stockQuantity: 10,
        sku: 'SKINCARE-ORG-001-OILY'
      }
    ],
    isActive: true,
    isFeatured: false,
    tags: ['beauty', 'skincare', 'organic', 'natural'],
    seoTitle: 'Organic Skincare Set - Natural Beauty Products',
    seoDescription: 'Complete organic skincare set with natural ingredients for healthy, glowing skin.'
  },
  {
    category: categoryIds.sports,
    name: 'Yoga Mat Premium',
    slug: 'yoga-mat-premium',
    description: 'High-quality non-slip yoga mat with extra cushioning. Perfect for yoga, pilates, and fitness workouts.',
    price: 25000,
    sku: 'YOGA-MAT-001',
    stockQuantity: 35,
    images: [
      {
        url: '/images/products/yoga-mat-main.jpg',
        altText: 'Premium Yoga Mat - Main View',
        displayOrder: 0,
        isPrimary: true
      }
    ],
    variants: [
      {
        variantType: 'color',
        variantValue: 'Purple',
        priceAdjustment: 0,
        stockQuantity: 12,
        sku: 'YOGA-MAT-001-PURPLE'
      },
      {
        variantType: 'color',
        variantValue: 'Blue',
        priceAdjustment: 0,
        stockQuantity: 13,
        sku: 'YOGA-MAT-001-BLUE'
      },
      {
        variantType: 'color',
        variantValue: 'Green',
        priceAdjustment: 0,
        stockQuantity: 10,
        sku: 'YOGA-MAT-001-GREEN'
      }
    ],
    isActive: true,
    isFeatured: true,
    tags: ['sports', 'yoga', 'fitness', 'exercise'],
    seoTitle: 'Premium Yoga Mat - Non-Slip Exercise Mat',
    seoDescription: 'High-quality non-slip yoga mat with extra cushioning for yoga, pilates, and fitness workouts.'
  }
];

// Admin user data
const adminUserData = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@udehglobal.com',
  password: 'admin123456', // This will be hashed
  role: 'admin',
  isEmailVerified: true
};

// Seed function
const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({ role: 'admin' });

    console.log('🌱 Seeding categories...');
    const createdCategories = await Category.insertMany(categoriesData);
    
    // Create category mapping
    const categoryIds = {
      clothing: createdCategories.find(c => c.slug === 'clothing-apparel')?._id,
      electronics: createdCategories.find(c => c.slug === 'electronics-tech')?._id,
      home: createdCategories.find(c => c.slug === 'home-living')?._id,
      beauty: createdCategories.find(c => c.slug === 'beauty-personal-care')?._id,
      sports: createdCategories.find(c => c.slug === 'sports-fitness')?._id,
      automotive: createdCategories.find(c => c.slug === 'automotive')?._id,
      books: createdCategories.find(c => c.slug === 'books-education')?._id,
      tools: createdCategories.find(c => c.slug === 'tools-hardware')?._id
    };

    console.log('🌱 Seeding products...');
    const productsData = createProductsData(categoryIds);
    await Product.insertMany(productsData);

    console.log('🌱 Creating admin user...');
    // Don't hash password here - User model pre-save hook will handle it
    await User.create(adminUserData);

    console.log('✅ Database seeded successfully!');
    console.log(`📦 Created ${createdCategories.length} categories`);
    console.log(`👟 Created ${productsData.length} products`);
    console.log('👨‍💼 Created admin user with credentials:');
    console.log(`   Email: ${adminUserData.email}`);
    console.log(`   Password: ${adminUserData.password}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  seedDatabase();
}

export { seedDatabase };