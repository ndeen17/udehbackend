import { Router } from 'express';
import authRoutes from './auth';
import categoryRoutes from './categories';
import productRoutes from './products';
import cartRoutes from './cart';
import orderRoutes from './orders';
import userRoutes from './users';
import adminRoutes from './admin';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'UDEH GLOBAL API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;