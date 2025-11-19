import { Router } from 'express';
import { userController } from '../controllers/userController';
import { auth } from '../middleware/auth';

const router = Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, userController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, userController.updateProfile);

// @route   GET /api/users/addresses
// @desc    Get user addresses
// @access  Private
router.get('/addresses', auth, userController.getAddresses);

// @route   POST /api/users/addresses
// @desc    Add new address
// @access  Private
router.post('/addresses', auth, userController.addAddress);

// @route   PUT /api/users/addresses/:id
// @desc    Update address
// @access  Private
router.put('/addresses/:id', auth, userController.updateAddress);

// @route   DELETE /api/users/addresses/:id
// @desc    Delete address
// @access  Private
router.delete('/addresses/:id', auth, userController.deleteAddress);

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', auth, userController.changePassword);

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, userController.deleteAccount);

export default router;