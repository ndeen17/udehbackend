import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';

class AuthController {
  // Register new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendErrorResponse(res, 'Validation failed', 400, errors.array());
        return;
      }

      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        sendErrorResponse(res, 'User already exists with this email', 400);
        return;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'customer',
        isActive: true,
        emailVerified: false
      });

      await user.save();

      // Generate email verification token
      const verificationToken = Math.random().toString(36).substring(2, 15);
      user.emailVerificationToken = verificationToken;
      await user.save();

      // Send welcome email with verification link
      try {
        await emailService.sendWelcomeEmail(email, firstName || email, verificationToken);
        console.log(`Welcome email sent to: ${email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      // Generate tokens
      const accessToken = generateToken(user._id.toString(), user.role);
      const refreshToken = generateRefreshToken(user._id.toString());

      // Return user data (without password)
      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      };

      sendSuccessResponse(res, {
        user: userData,
        accessToken,
        refreshToken
      }, 'User registered successfully', 201);

    } catch (error: any) {
      console.error('Registration error:', error);
      sendErrorResponse(res, 'Registration failed', 500);
    }
  }

  // Login user
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendErrorResponse(res, 'Validation failed', 400, errors.array());
        return;
      }

      const { email, password } = req.body;

      // Find user and explicitly select password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        sendErrorResponse(res, 'Invalid credentials', 401);
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        sendErrorResponse(res, 'Account is deactivated', 401);
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        sendErrorResponse(res, 'Invalid credentials', 401);
        return;
      }

      // Generate tokens
      const accessToken = generateToken(user._id.toString(), user.role);
      const refreshToken = generateRefreshToken(user._id.toString());

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Return user data (without password)
      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      };

      sendSuccessResponse(res, {
        user: userData,
        accessToken,
        refreshToken
      }, 'Login successful');

    } catch (error: any) {
      console.error('Login error:', error);
      sendErrorResponse(res, 'Login failed', 500);
    }
  }

  // Logout user
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a production app, you might want to blacklist the refresh token
      sendSuccessResponse(res, null, 'Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
      sendErrorResponse(res, 'Logout failed', 500);
    }
  }

  // Refresh access token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        sendErrorResponse(res, 'Refresh token required', 400);
        return;
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        sendErrorResponse(res, 'Invalid refresh token', 401);
        return;
      }

      // Generate new access token
      const accessToken = generateToken(user._id.toString(), user.role);

      sendSuccessResponse(res, {
        accessToken
      }, 'Token refreshed successfully');

    } catch (error: any) {
      console.error('Token refresh error:', error);
      sendErrorResponse(res, 'Token refresh failed', 401);
    }
  }

  // Forgot password
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists
        sendSuccessResponse(res, null, 'If the email exists, a reset link has been sent');
        return;
      }

      // Generate reset token (implement email sending in production)
      const resetToken = Math.random().toString(36).substring(2);
      (user as any).resetPasswordToken = resetToken;
      (user as any).resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // Send password reset email
      await emailService.sendPasswordResetEmail(email, user.firstName || email, resetToken);
      console.log(`Password reset email sent to: ${email}`);

      sendSuccessResponse(res, null, 'If the email exists, a reset link has been sent');

    } catch (error: any) {
      console.error('Forgot password error:', error);
      sendErrorResponse(res, 'Password reset request failed', 500);
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        sendErrorResponse(res, 'Token and new password are required', 400);
        return;
      }

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      });

      if (!user) {
        sendErrorResponse(res, 'Invalid or expired reset token', 400);
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user
      user.password = hashedPassword;
      (user as any).resetPasswordToken = undefined;
      (user as any).resetPasswordExpires = undefined;
      await user.save();

      sendSuccessResponse(res, null, 'Password reset successful');

    } catch (error: any) {
      console.error('Password reset error:', error);
      sendErrorResponse(res, 'Password reset failed', 500);
    }
  }

  // Verify email
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // Find user with verification token
      const user = await User.findOne({ emailVerificationToken: token });
      
      if (!user) {
        sendErrorResponse(res, 'Invalid verification token', 400);
        return;
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens for auto-login
      const accessToken = generateToken(user._id.toString(), user.role);
      const refreshToken = generateRefreshToken(user._id.toString());

      // Return user data with tokens
      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      };

      sendSuccessResponse(res, {
        user: userData,
        accessToken,
        refreshToken
      }, 'Email verified successfully');

    } catch (error: any) {
      console.error('Email verification error:', error);
      sendErrorResponse(res, 'Email verification failed', 500);
    }
  }

  // Resend verification email
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        sendErrorResponse(res, 'User not found', 404);
        return;
      }

      if (user.emailVerified) {
        sendErrorResponse(res, 'Email already verified', 400);
        return;
      }

      // Generate new verification token
      const verificationToken = Math.random().toString(36).substring(2);
      user.emailVerificationToken = verificationToken;
      await user.save();

      // Send verification email
      await emailService.sendWelcomeEmail(email, user.firstName || email, verificationToken);
      console.log(`Verification email sent to: ${email}`);

      sendSuccessResponse(res, null, 'Verification email sent');

    } catch (error: any) {
      console.error('Resend verification error:', error);
      sendErrorResponse(res, 'Failed to resend verification email', 500);
    }
  }
}

export const authController = new AuthController();