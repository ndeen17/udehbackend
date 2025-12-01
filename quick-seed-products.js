// Quick script to add a few test products to the database
require('dotenv').config();
const mongoose = require('mongoose');

// Simple Product schema (matching your model)
const productSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  price: Number,
  comparePrice: Number,
  category: String,
  stockQuantity: Number,
  images: [{ url: String, altText: String, displayOrder: Number, isPrimary: Boolean }],
  variants: [],
  isActive: Boolean,
  isFeatured: Boolean,
  tags: [String],
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const testProducts = [
  {
    name: 'Classic Leather Sneakers',
    slug: 'classic-leather-sneakers',
    description: 'Premium leather sneakers with comfortable fit and timeless design. Perfect for everyday wear.',
    price: 45000,
    comparePrice: 55000,
    category: 'Footwear',
    stockQuantity: 50,
    images: [],
    variants: [],
    isActive: true,
    isFeatured: true,
    tags: ['sneakers', 'leather', 'casual'],
    averageRating: 0,
    reviewCount: 0
  },
  {
    name: 'Running Shoes Pro',
    slug: 'running-shoes-pro',
    description: 'High-performance running shoes with advanced cushioning technology. Built for speed and comfort.',
    price: 35000,
    comparePrice: 42000,
    category: 'Footwear',
    stockQuantity: 30,
    images: [],
    variants: [],
    isActive: true,
    isFeatured: false,
    tags: ['running', 'sports', 'athletic'],
    averageRating: 0,
    reviewCount: 0
  },
  {
    name: 'Elegant Dress Shoes',
    slug: 'elegant-dress-shoes',
    description: 'Sophisticated dress shoes for formal occasions. Handcrafted with premium materials.',
    price: 60000,
    comparePrice: 70000,
    category: 'Footwear',
    stockQuantity: 20,
    images: [],
    variants: [],
    isActive: true,
    isFeatured: false,
    tags: ['formal', 'dress', 'elegant'],
    averageRating: 0,
    reviewCount: 0
  },
  {
    name: 'Casual Canvas Shoes',
    slug: 'casual-canvas-shoes',
    description: 'Comfortable canvas shoes for daily wear. Lightweight and breathable.',
    price: 25000,
    comparePrice: 30000,
    category: 'Footwear',
    stockQuantity: 75,
    images: [],
    variants: [],
    isActive: true,
    isFeatured: false,
    tags: ['casual', 'canvas', 'comfortable'],
    averageRating: 0,
    reviewCount: 0
  },
  {
    name: 'Sport Training Shoes',
    slug: 'sport-training-shoes',
    description: 'Versatile training shoes for gym and outdoor activities. Maximum support and flexibility.',
    price: 40000,
    comparePrice: 48000,
    category: 'Footwear',
    stockQuantity: 40,
    images: [],
    variants: [],
    isActive: true,
    isFeatured: true,
    tags: ['sport', 'training', 'gym'],
    averageRating: 0,
    reviewCount: 0
  }
];

async function seedProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    console.log('Checking existing products...');
    const count = await Product.countDocuments();
    console.log(`Found ${count} existing products`);

    if (count === 0) {
      console.log('Adding test products...');
      await Product.insertMany(testProducts);
      console.log('✅ Added 3 test products');
    } else {
      console.log('Products already exist. Skipping seed.');
    }

    console.log('\nCurrent products in database:');
    const products = await Product.find().select('name price stockQuantity isActive');
    products.forEach(p => {
      console.log(`- ${p.name} | ₦${p.price} | Stock: ${p.stockQuantity} | Active: ${p.isActive}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedProducts();
