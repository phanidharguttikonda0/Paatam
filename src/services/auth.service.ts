import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma';

// Secret keys (Should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_here';
const JWT_EXPIRES_IN = '15m'; // Short lived Access Token

export class AuthService {
  /**
   * Generates a short-lived JWT Access Token
   */
  static generateAccessToken(userId: bigint, userType: string, corporateId?: bigint): string {
    return jwt.sign(
      { 
        userId: userId.toString(), 
        role: userType,
        corporateId: corporateId?.toString() 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generates a long-lived Opaque Refresh Token and stores it in the database
   */
  static async generateAndStoreRefreshToken(userId: bigint, userType: string): Promise<string> {
    // Generate a random 40-character hex string (opaque token)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Set expiration for 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store in Database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: userId,
        user_type: userType,
        expires_at: expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * Validates a refresh token and issues a new access token
   */
  static async refreshAccessToken(token: string): Promise<string | null> {
    // 1. Find the token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    // 2. If token not found, it's invalid
    if (!storedToken) {
      return null;
    }

    // 3. If token is expired, delete it and return null
    if (new Date() > storedToken.expires_at) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return null;
    }

    // 4. Token is valid. Issue a new short-lived Access Token
    const newAccessToken = this.generateAccessToken(
      storedToken.user_id,
      storedToken.user_type
    );

    return newAccessToken;
  }

  /**
   * Verify an Access Token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}
