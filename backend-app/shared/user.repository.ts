import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import databasePool from './config/database.config.js';

export interface UserRecord {
  id: number;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export interface IUserRepository {
  getUserByUsername(username: string): Promise<UserRecord | null>;
  getUserById(userId: number): Promise<UserRecord | null>;
  createUser(username: string): Promise<UserRecord>;
  getOrCreateUser(username: string): Promise<UserRecord>;
}

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository implements IUserRepository {
  private mapUserRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      username: row.username,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async getUserByUsername(username: string): Promise<UserRecord | null> {
    const [rows] = await databasePool.query<UserRow[]>(
      'SELECT id, username, created_at, updated_at FROM users WHERE username = ?',
      [username]
    );

    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  public async getUserById(userId: number): Promise<UserRecord | null> {
    const [rows] = await databasePool.query<UserRow[]>(
      'SELECT id, username, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  public async createUser(username: string): Promise<UserRecord> {
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

  public async getOrCreateUser(username: string): Promise<UserRecord> {
    const existing = await this.getUserByUsername(username);
    return existing ?? this.createUser(username);
  }
}
