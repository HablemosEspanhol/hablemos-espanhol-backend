import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import databasePool from '../../shared/config/database.config.js';
import { User } from './auth.types.js';
import { IAuthRepository } from './iauth.repository.js';

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export class AuthRepository implements IAuthRepository {
  private mapUserRow(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const [rows] = await databasePool.query<UserRow[]>(
      'SELECT id, username, created_at, updated_at FROM users WHERE username = ?',
      [username]
    );

    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  public async createUser(username: string): Promise<User> {
    const connection = await databasePool.getConnection();

    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO users (username) VALUES (?)',
        [username]
      );

      const [rows] = await connection.query<UserRow[]>(
        'SELECT id, username, created_at, updated_at FROM users WHERE id = ?',
        [insertResult.insertId]
      );

      await connection.commit();

      if (rows.length === 0) {
        throw new Error('Failed to create user');
      }

      return this.mapUserRow(rows[0]);
    } catch (error) {
      await connection.rollback();
      throw error instanceof Error ? error : new Error('Failed to create user in database');
    } finally {
      connection.release();
    }
  }

  public async getUserById(userId: number): Promise<User | null> {
    const [rows] = await databasePool.query<UserRow[]>(
      'SELECT id, username, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }
}
