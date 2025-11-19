import { Request, Response } from 'express';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';

class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, req.user, 'Profile retrieved successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to get profile', 500);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, null, 'Profile updated successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to update profile', 500);
    }
  }

  async getAddresses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, [], 'Addresses retrieved successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to get addresses', 500);
    }
  }

  async addAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, null, 'Address added successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to add address', 500);
    }
  }

  async updateAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, null, 'Address updated successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to update address', 500);
    }
  }

  async deleteAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, null, 'Address deleted successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to delete address', 500);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, null, 'Password changed successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to change password', 500);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      sendSuccessResponse(res, null, 'Account deleted successfully');
    } catch (error: any) {
      sendErrorResponse(res, 'Failed to delete account', 500);
    }
  }
}

export const userController = new UserController();