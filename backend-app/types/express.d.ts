import { TokenPayload } from '../modules/auth/auth.types.js'; // Ajuste a importação para a sua interface de payload do token

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload; // Ou defina o tipo explicitamente: { userId: string | number; username: string }
    }
  }
}