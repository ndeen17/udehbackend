import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { adminAuth } from '../middleware/auth';
import { uploadProductImages } from '../middleware/upload';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Dashboard & Analytics
router.get('/dashboard', adminController.getDashboard);
router.get('/analytics/sales', adminController.getSalesAnalytics);
router.get('/analytics/products', adminController.getProductAnalytics);
router.get('/analytics/customers', adminController.getCustomerAnalytics);

// Product Management
router.get('/products', adminController.getAllProducts);
router.post('/products', adminController.createProduct);
router.get('/products/:id', adminController.getProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/:id/images', uploadProductImages, adminController.uploadProductImages);
router.delete('/products/:id/images/:imageId', adminController.deleteProductImage);
router.put('/products/bulk-update', adminController.bulkUpdateProducts);

// Category Management
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.put('/categories/reorder', adminController.reorderCategories);

// Order Management
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrder);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.put('/orders/:id/tracking', adminController.updateOrderTracking);
router.post('/orders/:id/refund', adminController.processRefund);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/notes', adminController.addUserNote);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

export default router;