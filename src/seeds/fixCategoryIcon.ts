import mongoose from 'mongoose';
import { Category } from '../models/Category';
import dotenv from 'dotenv';

dotenv.config();

const fixCategoryIcon = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://nurudeeny17:Rich4ever@cluster0.gkcwpna.mongodb.net/udehglobal';
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected');

    // Update the Shoes category icon
    const result = await Category.updateOne(
      { slug: 'shoes' },
      { $set: { iconName: 'Footprints' } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Updated Shoes category icon to Footprints');
    } else {
      console.log('ℹ️  Shoes category already has the correct icon or was not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixCategoryIcon();
