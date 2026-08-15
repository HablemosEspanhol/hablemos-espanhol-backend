export interface User {
  id: number;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: {
    id: number;
    username: string;
  };
}

export interface TokenPayload {
  userId: number;
  username: string;
  iat: number;
  exp: number;
}
