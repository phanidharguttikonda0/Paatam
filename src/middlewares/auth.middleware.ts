import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { BRANCH_ADMIN_ROLES, UserRole } from '../enums/role.enum';

/**
 * Middleware to protect routes and require a valid JWT Access Token
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const decodedToken = AuthService.verifyAccessToken(token);

  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
  }

  // Attach decoded user info to the request object for use in controllers
  (req as any).user = decodedToken;
  next();
};

/**
 * Middleware to restrict access to specific roles (RBAC)
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.role) {
      return res.status(403).json({ message: 'Forbidden: No role found' });
    }

    const hasPermission = allowedRoles.some((role) => {
      if (role === UserRole.BRANCH_ADMIN) {
        return BRANCH_ADMIN_ROLES.includes(user.role);
      }
      return role === user.role;
    });

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

