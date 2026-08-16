import crypto from 'crypto';
import { User, LoginPayload, AuthResponse, TokenPayload } from './auth.types.js';
import Logger from '../../shared/Logger.js';
import { IUserRepository } from '../../shared/user.repository.js';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private readonly JWT_EXPIRATION_DAYS = 5;
  private readonly JWT_EXPIRATION_SECONDS = this.JWT_EXPIRATION_DAYS * 24 * 60 * 60;
  private readonly tokenCache = new Map<string, string>();

  constructor(private readonly repository: IUserRepository) {}

  private base64UrlEncode(value: string | Buffer): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  private signToken(payload: TokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', this.JWT_SECRET)
      .update(data)
      .digest();

    return `${data}.${this.base64UrlEncode(signature)}`;
  }

  private verifyTokenSignature(token: string): TokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.base64UrlEncode(
      crypto.createHmac('sha256', this.JWT_SECRET).update(data).digest()
    );

    if (encodedSignature.length !== expectedSignature.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(Buffer.from(encodedSignature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  }

  private async validateCredentialsAgainstSheet(
    username: string,
    password: string
  ): Promise<boolean> {
    const apiUrl = process.env.AUTH_API_URL;
    if (!apiUrl) {
      throw new Error('AUTH_API_URL undefined');
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error('Failed to validate credentials');
    }

    const csvData = await response.text();
    const lines = csvData.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
      const [nome_completo, tipo, sheetUsername, email, sheetPassword] = line.split(',').map(value => value.trim());
      if (sheetUsername === username && sheetPassword === password) {
        Logger.info("[AuthService] User Found", nome_completo, tipo, email);
        return true;
      }
    }

    return false;
  }

  private generateToken(user: User): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      iat: now,
      exp: now + this.JWT_EXPIRATION_SECONDS,
    };

    return this.signToken(payload);
  }

  public async authenticate(payload: LoginPayload): Promise<AuthResponse> {
    const { username, password } = payload;

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const isValidCredentials = await this.validateCredentialsAgainstSheet(username, password);
    if (!isValidCredentials) {
      throw new Error('Invalid credentials');
    }

    let user = await this.repository.getUserByUsername(username);
    if (!user) {
      user = await this.repository.createUser(username);
    }

    const token = this.generateToken(user);
    this.tokenCache.set(username, token);
    Logger.info('[AuthService] Login OK', username);

    return {
      token,
      expiresIn: this.JWT_EXPIRATION_SECONDS,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  public validateToken(token: string): TokenPayload | null {
    try {
      return this.verifyTokenSignature(token);
    } catch {
      return null;
    }
  }

  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1];
  }

  public getTokenFromCache(username: string): string | undefined {
    return this.tokenCache.get(username);
  }

  public removeTokenFromCache(username: string): void {
    this.tokenCache.delete(username);
  }
}
