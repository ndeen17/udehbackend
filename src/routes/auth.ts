import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validateRegister, validateLogin, validatePasswordReset } from '../middleware/validation';

const router = Router();

// Rate limiting removed for development

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegister, authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, authController.login);

// @route   POST /api/auth/logout
// @desc    Logout user (clear refresh token)
// @access  Public
router.post('/logout', authController.logout);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', authController.refreshToken);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', validatePasswordReset, authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authController.resetPassword);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.get('/verify-email/:token', authController.verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post('/resend-verification', authController.resendVerification);

export default router;