"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const jwt_1 = require("../utils/jwt");
const helpers_1 = require("../utils/helpers");
const express_validator_1 = require("express-validator");
const emailService_1 = require("../services/emailService");
class AuthController {
    async register(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                (0, helpers_1.sendErrorResponse)(res, 'Validation failed', 400, errors.array());
                return;
            }
            const { email, password, firstName, lastName, phone } = req.body;
            const existingUser = await User_1.User.findOne({ email });
            if (existingUser) {
                (0, helpers_1.sendErrorResponse)(res, 'User already exists with this email', 400);
                return;
            }
            const saltRounds = 12;
            const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
            const user = new User_1.User({
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
            const verificationToken = Math.random().toString(36).substring(2, 15);
            user.emailVerificationToken = verificationToken;
            await user.save();
            try {
                await emailService_1.emailService.sendWelcomeEmail(email, firstName || email, verificationToken);
                console.log(`Welcome email sent to: ${email}`);
            }
            catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
            }
            const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
            const refreshToken = (0, jwt_1.generateRefreshToken)(user._id.toString());
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
            (0, helpers_1.sendSuccessResponse)(res, {
                user: userData,
                accessToken,
                refreshToken
            }, 'User registered successfully', 201);
        }
        catch (error) {
            console.error('Registration error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Registration failed', 500);
        }
    }
    async login(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                (0, helpers_1.sendErrorResponse)(res, 'Validation failed', 400, errors.array());
                return;
            }
            const { email, password } = req.body;
            const user = await User_1.User.findOne({ email }).select('+password');
            if (!user) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid credentials', 401);
                return;
            }
            if (!user.isActive) {
                (0, helpers_1.sendErrorResponse)(res, 'Account is deactivated', 401);
                return;
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid credentials', 401);
                return;
            }
            const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
            const refreshToken = (0, jwt_1.generateRefreshToken)(user._id.toString());
            user.lastLogin = new Date();
            await user.save();
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
            (0, helpers_1.sendSuccessResponse)(res, {
                user: userData,
                accessToken,
                refreshToken
            }, 'Login successful');
        }
        catch (error) {
            console.error('Login error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Login failed', 500);
        }
    }
    async logout(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Logout successful');
        }
        catch (error) {
            console.error('Logout error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Logout failed', 500);
        }
    }
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                (0, helpers_1.sendErrorResponse)(res, 'Refresh token required', 400);
                return;
            }
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            const user = await User_1.User.findById(decoded.id);
            if (!user || !user.isActive) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid refresh token', 401);
                return;
            }
            const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
            (0, helpers_1.sendSuccessResponse)(res, {
                accessToken
            }, 'Token refreshed successfully');
        }
        catch (error) {
            console.error('Token refresh error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Token refresh failed', 401);
        }
    }
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const user = await User_1.User.findOne({ email });
            if (!user) {
                (0, helpers_1.sendSuccessResponse)(res, null, 'If the email exists, a reset link has been sent');
                return;
            }
            const resetToken = Math.random().toString(36).substring(2);
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = new Date(Date.now() + 3600000);
            await user.save();
            await emailService_1.emailService.sendPasswordResetEmail(email, user.firstName || email, resetToken);
            console.log(`Password reset email sent to: ${email}`);
            (0, helpers_1.sendSuccessResponse)(res, null, 'If the email exists, a reset link has been sent');
        }
        catch (error) {
            console.error('Forgot password error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Password reset request failed', 500);
        }
    }
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                (0, helpers_1.sendErrorResponse)(res, 'Token and new password are required', 400);
                return;
            }
            const user = await User_1.User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            });
            if (!user) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid or expired reset token', 400);
                return;
            }
            const saltRounds = 12;
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            (0, helpers_1.sendSuccessResponse)(res, null, 'Password reset successful');
        }
        catch (error) {
            console.error('Password reset error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Password reset failed', 500);
        }
    }
    async verifyEmail(req, res) {
        try {
            const { token } = req.params;
            const user = await User_1.User.findOne({ emailVerificationToken: token });
            if (!user) {
                (0, helpers_1.sendErrorResponse)(res, 'Invalid verification token', 400);
                return;
            }
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.lastLogin = new Date();
            await user.save();
            const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
            const refreshToken = (0, jwt_1.generateRefreshToken)(user._id.toString());
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
            (0, helpers_1.sendSuccessResponse)(res, {
                user: userData,
                accessToken,
                refreshToken
            }, 'Email verified successfully');
        }
        catch (error) {
            console.error('Email verification error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Email verification failed', 500);
        }
    }
    async resendVerification(req, res) {
        try {
            const { email } = req.body;
            const user = await User_1.User.findOne({ email });
            if (!user) {
                (0, helpers_1.sendErrorResponse)(res, 'User not found', 404);
                return;
            }
            if (user.emailVerified) {
                (0, helpers_1.sendErrorResponse)(res, 'Email already verified', 400);
                return;
            }
            const verificationToken = Math.random().toString(36).substring(2);
            user.emailVerificationToken = verificationToken;
            await user.save();
            await emailService_1.emailService.sendWelcomeEmail(email, user.firstName || email, verificationToken);
            console.log(`Verification email sent to: ${email}`);
            (0, helpers_1.sendSuccessResponse)(res, null, 'Verification email sent');
        }
        catch (error) {
            console.error('Resend verification error:', error);
            (0, helpers_1.sendErrorResponse)(res, 'Failed to resend verification email', 500);
        }
    }
}
exports.authController = new AuthController();
