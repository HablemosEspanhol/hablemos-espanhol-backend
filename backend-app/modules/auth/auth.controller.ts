import { Controller, Post, Body, Route, Response, SuccessResponse, Tags } from 'tsoa';
import { AuthService } from './auth.service.js';
import { LoginPayload, AuthResponse } from './auth.types.js';
import DI from '../../shared/di.js';

@Tags("Auth")
@Route("api/auth")
export class AuthController extends Controller {
  constructor(private readonly authService: AuthService = DI.AuthService) {
    super();
  }

  /**
   * Autentica o usuário e retorna o token de acesso.
   */
  @Post()
  @SuccessResponse("200", "Autenticado com sucesso")
  @Response("400", "Credenciais ausentes ou inválidas")
  @Response("401", "Credenciais incorretas")
  @Response("502", "Erro de comunicação com o serviço de autenticação")
  public async login(
    @Body() requestBody: LoginPayload
  ): Promise<AuthResponse> {
    const { username, password } = requestBody;

    if (!username || !password) {
      this.setStatus(400);
      throw new Error('Username and password are required');
    }

    try {
      return await this.authService.authenticate({ username, password });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';

      if (message === 'Invalid credentials') {
        this.setStatus(401);
        throw new Error(message);
      }

      if (message === 'Failed to validate credentials') {
        this.setStatus(502);
        throw new Error(message);
      }

      this.setStatus(500);
      throw new Error('Internal server error');
    }
  }
}