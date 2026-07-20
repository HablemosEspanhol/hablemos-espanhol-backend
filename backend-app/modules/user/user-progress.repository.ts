import { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import databasePool from "../../shared/config/database.config.js";
import { UserProgress, ExerciseStoreInput, DbExerciseMapItem, DbRawPhraseProgress, ExerciseMapRow, PhraseProgressRow, PhraseRow, UserProgressRow } from "./user-progress.types.js";
import { IUserProgressRepository } from "./iuser-progress.repository.js";


export class UserProgressRepository implements IUserProgressRepository {
  private readonly defaultLevel = 'A1';

  constructor() {}

  private mapProgressRow(row: any): UserProgress {
    return {
      id: row.id,
      username: row.username,
      nivelAtual: row.current_level || this.defaultLevel,
      totalAcertos: row.total_correct || 0,
      totalErros: row.total_incorrect || 0,
      ultimaAtividade: row.last_activity ? new Date(row.last_activity) : new Date()
    };
  }

  public async getOrCreateUser(username: string): Promise<UserProgress> {
    const [rows] = await databasePool.query<UserProgressRow[]>(
      `SELECT u.id, u.username, up.current_level, up.total_correct, up.total_incorrect, up.last_activity 
       FROM users u 
       JOIN user_progress up ON u.id = up.user_id 
       WHERE u.username = ?`,
      [username]
    );

    if (rows[0]) {
      return this.mapProgressRow(rows[0]);
    }

    const connection = await databasePool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [userResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO users (username) VALUES (?)',
        [username]
      );
      const userId = userResult.insertId;

      await connection.query(
        'INSERT INTO user_progress (user_id, current_level, total_correct, total_incorrect, last_activity) VALUES (?, ?, 0, 0, NOW())',
        [userId, this.defaultLevel]
      );

      await connection.commit();
      
      return {
        id: userId,
        username,
        nivelAtual: this.defaultLevel,
        totalAcertos: 0,
        totalErros: 0,
        ultimaAtividade: new Date()
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async getUserLevel(username: string): Promise<string> {
    const [rows] = await databasePool.query<UserProgressRow[]>(
      'SELECT up.current_level FROM users u JOIN user_progress up ON u.id = up.user_id WHERE u.username = ?',
      [username]
    );
    return rows[0] ? rows[0].current_level : this.defaultLevel;
  }

  public async storeExercises(userId: number, exercises: ExerciseStoreInput[]): Promise<void> {
    const values = exercises.map(exercise => [
      exercise.instanceId,
      exercise.id,
      userId,
      exercise.palavra,
      exercise.type,
      exercise.correctAnswer
    ]);

    await databasePool.query(
      'INSERT INTO exercise_instances (id, exercise_id, user_id, phrase, exercise_type, correct_answer) VALUES ?',
      [values]
    );
  }

  public async getExerciseMapForUser(userId: number, exerciseIds: string[]): Promise<Map<string, DbExerciseMapItem>> {
    const [exerciseRows] = await databasePool.query<ExerciseMapRow[]>(
      `SELECT ei.id AS instance_id, ei.exercise_id, ei.correct_answer, ei.phrase
       FROM exercise_instances ei
       INNER JOIN (
         SELECT exercise_id, MAX(created_at) AS latest_created_at
         FROM exercise_instances
         WHERE exercise_id IN (?) AND user_id = ?
         GROUP BY exercise_id
       ) latest ON latest.exercise_id = ei.exercise_id AND latest.latest_created_at = ei.created_at
       WHERE ei.exercise_id IN (?) AND ei.user_id = ?`,
      [exerciseIds, userId, exerciseIds, userId]
    );
    return new Map(exerciseRows.map(row => [row.exercise_id, row]));
  }

  public async getExerciseMapWithConnection(
    connection: PoolConnection, 
    userId: number, 
    exerciseIds: string[]
  ): Promise<Map<string, DbExerciseMapItem>> {
    const [exerciseRows] = await connection.query<ExerciseMapRow[]>(
      `SELECT ei.id AS instance_id, ei.exercise_id, ei.correct_answer, ei.phrase
       FROM exercise_instances ei
       INNER JOIN (
         SELECT exercise_id, MAX(created_at) AS latest_created_at
         FROM exercise_instances
         WHERE exercise_id IN (?) AND user_id = ?
         GROUP BY exercise_id
       ) latest ON latest.exercise_id = ei.exercise_id AND latest.latest_created_at = ei.created_at
       WHERE ei.exercise_id IN (?) AND ei.user_id = ?`,
      [exerciseIds, userId, exerciseIds, userId]
    );
    return new Map(exerciseRows.map(row => [row.exercise_id, row]));
  }

  public async saveExerciseResultsAndProgress(
    userId: number,
    resultsToInsert: Array<[number, string | null, string | null, number]>,
    phraseProgressUpdates: Array<{ phrase: string; correct: boolean; now: Date }>
  ): Promise<void> {
    const connection = await databasePool.getConnection();
    try {
      await connection.beginTransaction();

      if (resultsToInsert.length > 0) {
        await connection.query(
          'INSERT INTO exercise_results (user_id, exercise_instance_id, user_answer, correct) VALUES ?',
          [resultsToInsert]
        );
      }

      for (const update of phraseProgressUpdates) {
        await connection.execute(
          `INSERT INTO user_phrase_progress 
             (user_id, phrase, wrong_count, correct_count, last_seen_at)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             wrong_count = wrong_count + IF(?, 1, 0),
             correct_count = correct_count + IF(?, 1, 0),
             last_seen_at = ?`,
          [
            userId,
            update.phrase,
            update.correct ? 0 : 1,
            update.correct ? 1 : 0,
            update.now,
            !update.correct,
            update.correct,
            update.now
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async updateUserStats(userId: number, newLevel: string, totalCorrect: number, totalIncorrect: number): Promise<void> {
    await databasePool.query(
      'UPDATE user_progress SET current_level = ?, total_correct = ?, total_incorrect = ?, last_activity = ? WHERE user_id = ?',
      [newLevel, totalCorrect, totalIncorrect, new Date(), userId]
    );
  }

  public async getUserRecentPhrases(userId: number, correctStatus: number, limit: number): Promise<string[]> {
    const query = correctStatus === 0
      ? `SELECT ei.phrase FROM exercise_results er JOIN exercise_instances ei ON er.exercise_instance_id = ei.id 
         WHERE er.user_id = ? AND er.correct = 0 GROUP BY ei.phrase ORDER BY MAX(er.submitted_at) DESC LIMIT ?`
      : `SELECT ei.phrase FROM exercise_results er JOIN exercise_instances ei ON er.exercise_instance_id = ei.id 
         WHERE er.user_id = ? AND er.correct = 1 GROUP BY ei.phrase ORDER BY COUNT(*) DESC LIMIT ?`;

    const [rows] = await databasePool.query<PhraseRow[]>(query, [userId, limit]);
    return rows.map(row => row.phrase);
  }

  public async getRawPhraseProgressList(username: string): Promise<DbRawPhraseProgress[]> {
    const query = `SELECT phrase, wrong_count, correct_count, last_seen_at
                   FROM user_phrase_progress UPP
                   INNER JOIN users u ON (UPP.user_id = u.id)
                   WHERE u.username = ?`;

    const [rows] = await databasePool.query<PhraseProgressRow[]>(query, [username]);
    return rows.map(row => ({
      phrase: row.phrase,
      wrong_count: Number(row.wrong_count),
      correct_count: Number(row.correct_count),
      last_seen_at: new Date(row.last_seen_at)
    }));
  }
}