import { Request, Response, Router } from 'express';
import { BaseController } from '../../shared/base.controller.js';
import { AuthService } from './auth.service.js';
import { LoginPayload } from './auth.types.js';

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  protected initializeRoutes(router: Router): void {
    router.post('/auth', (req: Request, res: Response) => this.login(req, res));
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body as LoginPayload;

      if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const authResponse = await this.authService.authenticate({ username, password });
      res.status(200).json(authResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';

      if (message === 'Invalid credentials') {
        res.status(401).json({ error: message });
        return;
      }

      if (message.includes('required')) {
        res.status(400).json({ error: message });
        return;
      }

      if (message === 'Failed to validate credentials') {
        res.status(502).json({ error: message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
