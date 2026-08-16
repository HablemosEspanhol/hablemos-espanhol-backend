import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../modules/auth/auth.service.js';

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = authService.extractTokenFromHeader(req.header('authorization'));

    if (!token) {
      res.status(401).json({ error: 'Authorization token is required' });
      return;
    }

    const payload = authService.validateToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.headers['x-auth-user-id'] = String(payload.userId);
    req.headers['x-auth-username'] = payload.username;
    next();
  };
}
