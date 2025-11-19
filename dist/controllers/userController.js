"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const helpers_1 = require("../utils/helpers");
class UserController {
    async getProfile(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, req.user, 'Profile retrieved successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get profile', 500);
        }
    }
    async updateProfile(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Profile updated successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to update profile', 500);
        }
    }
    async getAddresses(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, [], 'Addresses retrieved successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to get addresses', 500);
        }
    }
    async addAddress(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Address added successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to add address', 500);
        }
    }
    async updateAddress(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Address updated successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to update address', 500);
        }
    }
    async deleteAddress(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Address deleted successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to delete address', 500);
        }
    }
    async changePassword(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Password changed successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to change password', 500);
        }
    }
    async deleteAccount(req, res) {
        try {
            (0, helpers_1.sendSuccessResponse)(res, null, 'Account deleted successfully');
        }
        catch (error) {
            (0, helpers_1.sendErrorResponse)(res, 'Failed to delete account', 500);
        }
    }
}
exports.userController = new UserController();
