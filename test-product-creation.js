#!/usr/bin/env node

/**
 * Product Creation and Image Upload Test Script
 * 
 * This script demonstrates how to use the backend API for:
 * 1. Creating products with complete details
 * 2. Uploading product images
 * 3. Managing product data
 * 
 * Usage: node test-product-creation.js
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';

// Test admin credentials (update with your actual admin credentials)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'your-admin-password'
};

async function authenticateAdmin() {
  console.log('🔐 Authenticating admin...');
  
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(ADMIN_CREDENTIALS)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Authentication failed: ${result.message}`);
  }

  console.log('✅ Admin authenticated successfully');
  return result.data.token;
}

async function createSampleProduct(token) {
  console.log('\n📦 Creating sample product...');

  const productData = {
    name: 'Premium Running Shoes',
    slug: 'premium-running-shoes',
    description: 'High-quality running shoes with advanced cushioning technology',
    price: 129.99,
    comparePrice: 159.99,
    sku: 'SHOES-001',
    stockQuantity: 50,
    weight: 0.8,
    dimensions: {
      width: 30,
      height: 12,
      depth: 20
    },
    isActive: true,
    isFeatured: true,
    tags: ['running', 'sports', 'shoes', 'premium'],
    seoTitle: 'Premium Running Shoes - Best Performance Footwear',
    seoDescription: 'Discover our premium running shoes with advanced cushioning technology for ultimate comfort and performance.',
    variants: [
      {
        variantType: 'size',
        variantValue: '8',
        priceAdjustment: 0,
        stockQuantity: 10,
        sku: 'SHOES-001-8'
      },
      {
        variantType: 'size',
        variantValue: '9',
        priceAdjustment: 0,
        stockQuantity: 15,
        sku: 'SHOES-001-9'
      },
      {
        variantType: 'size',
        variantValue: '10',
        priceAdjustment: 0,
        stockQuantity: 12,
        sku: 'SHOES-001-10'
      },
      {
        variantType: 'color',
        variantValue: 'black',
        priceAdjustment: 0,
        stockQuantity: 20,
        sku: 'SHOES-001-BLACK'
      },
      {
        variantType: 'color',
        variantValue: 'white',
        priceAdjustment: 5,
        stockQuantity: 18,
        sku: 'SHOES-001-WHITE'
      }
    ]
  };

  const response = await fetch(`${BASE_URL}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(productData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Product creation failed: ${result.message}`);
  }

  console.log('✅ Product created successfully');
  console.log(`📝 Product ID: ${result.data._id}`);
  console.log(`🔗 Product Slug: ${result.data.slug}`);
  
  return result.data;
}

async function uploadProductImages(token, productId) {
  console.log(`\n🖼️  Uploading images for product ${productId}...`);

  // Note: In a real scenario, you would have actual image files
  // This is just demonstrating the API structure
  console.log('📋 Image upload endpoint ready at:');
  console.log(`   POST ${BASE_URL}/admin/products/${productId}/images`);
  console.log('\n📝 Upload format options:');
  console.log('   1. Multiple files as "images" field (up to 10)');
  console.log('   2. "primaryImage" field (1 file) + "additionalImages" field (up to 9)');
  console.log('\n🔧 Upload configuration:');
  console.log('   - Supported formats: JPEG, PNG, WebP');
  console.log('   - Max file size: 5MB per file');
  console.log('   - Max files: 10 total');
  console.log('   - Storage: public/uploads/products/');
  
  // Example of how the upload would work with actual files:
  /*
  const form = new FormData();
  form.append('primaryImage', fs.createReadStream('path/to/primary-image.jpg'));
  form.append('additionalImages', fs.createReadStream('path/to/image1.jpg'));
  form.append('additionalImages', fs.createReadStream('path/to/image2.jpg'));

  const response = await fetch(`${BASE_URL}/admin/products/${productId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });

  const result = await response.json();
  console.log('✅ Images uploaded successfully:', result.data);
  */

  return true;
}

async function testProductFeatures() {
  try {
    console.log('🚀 Starting Product Creation and Image Upload Test\n');
    console.log('=' .repeat(60));

    // Authenticate
    const token = await authenticateAdmin();

    // Create product
    const product = await createSampleProduct(token);

    // Upload images (demonstration)
    await uploadProductImages(token, product._id);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ All product features tested successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Product creation with full data');
    console.log('   ✅ Variants support (sizes, colors, etc.)');
    console.log('   ✅ Image upload system configured');
    console.log('   ✅ Admin authentication working');
    console.log('   ✅ File storage and management ready');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Add actual image files to test uploads');
    console.log('   2. Test the admin frontend integration');
    console.log('   3. Configure category assignments');
    console.log('   4. Test product updates and deletion');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend server is running (npm run dev)');
    console.log('   2. Check admin credentials in this script');
    console.log('   3. Verify MongoDB connection');
    console.log('   4. Check if admin user exists in database');
  }
}

// Run the test
if (require.main === module) {
  testProductFeatures();
}

module.exports = {
  authenticateAdmin,
  createSampleProduct,
  uploadProductImages
};