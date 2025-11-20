import { Types } from 'mongoose';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        _id: Types.ObjectId | string;
        email: string;
        role: 'user' | 'admin';
        firstName?: string;
        lastName?: string;
      };
      guestId?: string;
    }
  }
}

export {};
