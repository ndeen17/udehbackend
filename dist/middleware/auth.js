"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminAuth = exports.adminAuth = exports.auth = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = require("../models/User");
const helpers_1 = require("../utils/helpers");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, helpers_1.sendErrorResponse)(res, 'No token provided', 401);
            return;
        }
        const token = authHeader.substring(7);
        if (!token) {
            (0, helpers_1.sendErrorResponse)(res, 'No token provided', 401);
            return;
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await User_1.User.findById(decoded.id).select('-password');
        if (!user) {
            (0, helpers_1.sendErrorResponse)(res, 'User not found', 401);
            return;
        }
        if (!user.isActive) {
            (0, helpers_1.sendErrorResponse)(res, 'User account is deactivated', 401);
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            (0, helpers_1.sendErrorResponse)(res, 'Invalid token', 401);
        }
        else if (error.name === 'TokenExpiredError') {
            (0, helpers_1.sendErrorResponse)(res, 'Token expired', 401);
        }
        else {
            (0, helpers_1.sendErrorResponse)(res, 'Authentication failed', 401);
        }
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token) {
                try {
                    const decoded = (0, jwt_1.verifyToken)(token);
                    const user = await User_1.User.findById(decoded.id).select('-password');
                    if (user && user.isActive) {
                        req.user = user;
                    }
                }
                catch (error) {
                }
            }
        }
        if (!req.user) {
            req.guestId = req.headers['x-guest-id'] || generateGuestId();
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, helpers_1.sendErrorResponse)(res, 'Authentication required', 401);
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, helpers_1.sendErrorResponse)(res, 'Insufficient permissions', 403);
            return;
        }
        next();
    };
};
exports.authorize = authorize;
exports.auth = exports.authenticate;
const adminAuth = async (req, res, next) => {
    await (0, exports.authenticate)(req, res, async () => {
        if (!req.user) {
            return;
        }
        if (req.user.role !== 'admin') {
            (0, helpers_1.sendErrorResponse)(res, 'Insufficient permissions. Admin access required.', 403);
            return;
        }
        next();
    });
};
exports.adminAuth = adminAuth;
const superAdminAuth = async (req, res, next) => {
    await (0, exports.authenticate)(req, res, async () => {
        if (!req.user) {
            return;
        }
        if (req.user.role !== 'super_admin') {
            (0, helpers_1.sendErrorResponse)(res, 'Insufficient permissions. Super admin access required.', 403);
            return;
        }
        next();
    });
};
exports.superAdminAuth = superAdminAuth;
const generateGuestId = () => {
    return 'guest_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};
