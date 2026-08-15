import { User } from './auth.types.js';

export interface IAuthRepository {
  getUserByUsername(username: string): Promise<User | null>;
  createUser(username: string): Promise<User>;
  getUserById(userId: number): Promise<User | null>;
}
