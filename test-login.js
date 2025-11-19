const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Get User model
    const User = mongoose.connection.collection('users');
    
    const admin = await User.findOne({ email: 'admin@udehglobal.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:', {
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      hasPassword: !!admin.password
    });
    
    // Test password
    const testPassword = 'admin123456';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    
    console.log(`🔐 Password test for "${testPassword}":`, isValid ? '✅ VALID' : '❌ INVALID');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
