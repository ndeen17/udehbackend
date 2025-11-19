import mongoose from 'mongoose';
import { Category } from '../models/Category';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const fixShoesIcon = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb+srv://nurudeeny17:Rich4ever@cluster0.gkcwpna.mongodb.net/udehglobal';
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected');

    // Find shoes category
    const shoesCategory = await Category.findOne({ slug: 'shoes' });
    
    if (!shoesCategory) {
      console.log('❌ Shoes category not found');
      process.exit(1);
    }

    console.log('📍 Current shoes category:');
    console.log(`   Name: ${shoesCategory.name}`);
    console.log(`   Icon: ${shoesCategory.iconName}`);

    // Update icon to Footprints
    shoesCategory.iconName = 'Footprints';
    await shoesCategory.save();

    console.log('✅ Updated shoes category icon to: Footprints');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixShoesIcon();
