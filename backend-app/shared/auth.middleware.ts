import { Request } from 'express';
import DI from './di.js'; // Seu container/instância de DI

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === 'jwt') {
    const authHeader = request.header('authorization');
    const token = DI.AuthService.extractTokenFromHeader(authHeader);

    if (!token) {
      return Promise.reject(new Error('Authorization token is required'));
    }

    const payload = DI.AuthService.validateToken(token);
    if (!payload) {
      return Promise.reject(new Error('Invalid or expired token'));
    }

    // O retorno desta função é automaticamente gravado em `request.user` pelo tsoa
    return Promise.resolve(payload);
  }

  return Promise.reject(new Error('Unknown security scheme'));
}