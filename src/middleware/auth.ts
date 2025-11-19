import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { User } from '../models/User';
import { sendErrorResponse } from '../utils/helpers';

// Extend Request with all Express properties explicitly
export interface AuthenticatedRequest extends Request {
  user?: any; // Will be populated with user data
  guestId?: string; // For guest cart management
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  body: any;
  params: any;
  query: any;
  headers: any;
}

// Main authentication middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendErrorResponse(res, 'No token provided', 401);
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      sendErrorResponse(res, 'No token provided', 401);
      return;
    }

    // Verify the token
    const decoded: JWTPayload = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      sendErrorResponse(res, 'User not found', 401);
      return;
    }

    if (!user.isActive) {
      sendErrorResponse(res, 'User account is deactivated', 401);
      return;
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      sendErrorResponse(res, 'Invalid token', 401);
    } else if (error.name === 'TokenExpiredError') {
      sendErrorResponse(res, 'Token expired', 401);
    } else {
      sendErrorResponse(res, 'Authentication failed', 401);
    }
  }
};

// Optional authentication - for guests and logged in users
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        try {
          const decoded: JWTPayload = verifyToken(token);
          const user = await User.findById(decoded.id).select('-password');
          
          if (user && user.isActive) {
            req.user = user;
          }
        } catch (error) {
          // Token invalid, continue as guest
        }
      }
    }
    
    // For guest users, use session ID or generate one
    if (!req.user) {
      req.guestId = req.headers['x-guest-id'] as string || generateGuestId();
    }
    
    next();
  } catch (error) {
    next();
  }
};

// Role-based authorization
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendErrorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendErrorResponse(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};

// Specific auth middlewares
export const auth = authenticate;

// Admin auth middleware - combines authentication and authorization
export const adminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await authenticate(req, res, async () => {
    if (!req.user) {
      return;
    }
    if (req.user.role !== 'admin') {
      sendErrorResponse(res, 'Insufficient permissions. Admin access required.', 403);
      return;
    }
    next();
  });
};

export const superAdminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await authenticate(req, res, async () => {
    if (!req.user) {
      return;
    }
    if (req.user.role !== 'super_admin') {
      sendErrorResponse(res, 'Insufficient permissions. Super admin access required.', 403);
      return;
    }
    next();
  });
};

// Helper function to generate guest ID
const generateGuestId = (): string => {
  return 'guest_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};