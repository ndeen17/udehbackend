import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface JWTPayload {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (userId: string, role: string = 'customer'): string => {
  const payload: JWTPayload = {
    id: userId,
    role: role
  };
  
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: '1h',
  });
};

export const generateRefreshToken = (userId: string): string => {
  const payload = {
    id: userId,
    type: 'refresh'
  };
  
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.verify(token, secret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): any => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  return jwt.verify(token, secret) as any;
};

export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};