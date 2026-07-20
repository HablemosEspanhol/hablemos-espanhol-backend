import { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import databasePool from "../config/database.config.js";
import { ChatContext } from "../../domain/models/chat.types.js";
import { UserProgress, ExerciseStoreInput, SubmitAnswerInput, CheckAnswerResult, UpdateProgressResult, PhraseProgressResult } from "../../domain/models/user-progress.types.js";
import { IUserProgressRepository } from "../../domain/repository/IUserProgressRepository.js";

// Definição das estruturas esperadas nas consultas do Pool MySQL
interface UserProgressRow extends RowDataPacket {
  id: number;
  username: string;
  current_level: string;
  total_correct: number;
  total_incorrect: number;
  last_activity: string | Date;
}

interface ExerciseMapRow extends RowDataPacket {
  instance_id: string;
  exercise_id: string;
  correct_answer: string;
  phrase: string;
}

interface PhraseRow extends RowDataPacket {
  phrase: string;
}

interface PhraseProgressRow extends RowDataPacket {
  phrase: string;
  wrong_count: string | number;
  correct_count: string | number;
  last_seen_at: string | Date;
}

export class UserProgressRepository implements IUserProgressRepository {
  private readonly defaultLevel = 'A1';
  private readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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

  private async getUserProgressRow(username: string): Promise<UserProgressRow | undefined> {
    const [rows] = await databasePool.query<UserProgressRow[]>(
      `SELECT u.id, u.username, up.current_level, up.total_correct, up.total_incorrect, up.last_activity 
       FROM users u 
       JOIN user_progress up ON u.id = up.user_id 
       WHERE u.username = ?`,
      [username]
    );
    return rows[0];
  }

  private async createUserWithProgress(username: string): Promise<any> {
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
        current_level: this.defaultLevel,
        total_correct: 0,
        total_incorrect: 0,
        last_activity: new Date()
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async getOrCreateUser(username: string): Promise<UserProgress> {
    const row = await this.getUserProgressRow(username);
    if (row) {
      return this.mapProgressRow(row);
    }
    const created = await this.createUserWithProgress(username);
    return this.mapProgressRow(created);
  }

  public async getUserLevel(username: string): Promise<string> {
    const row = await this.getUserProgressRow(username);
    return row ? row.current_level : this.defaultLevel;
  }

  public async storeExercises(username: string, exercises: ExerciseStoreInput[]): Promise<void> {
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return;
    }

    const validExercises = exercises.filter(exercise =>
      exercise &&
      typeof exercise.correctAnswer === 'string' &&
      exercise.correctAnswer.trim().length > 0
    );

    if (validExercises.length === 0) {
      return;
    }

    const user = await this.getOrCreateUser(username);
    const values = validExercises.map(exercise => [
      exercise.instanceId,
      exercise.id,
      user.id,
      exercise.palavra,
      exercise.type,
      exercise.correctAnswer
    ]);

    await databasePool.query(
      'INSERT INTO exercise_instances (id, exercise_id, user_id, phrase, exercise_type, correct_answer) VALUES ?',
      [values]
    );
  }

  public calculateLevelProgression(currentLevel: string, accuracy: number): string {
    const currentIndex = this.levels.indexOf(currentLevel);
    if (accuracy >= 0.8) {
      return this.levels[Math.min(currentIndex + 1, this.levels.length - 1)];
    }
    if (accuracy <= 0.5) {
      return this.levels[Math.max(currentIndex - 1, 0)];
    }
    return currentLevel;
  }

  private normalizeAnswer(value: any): string {
    return String(value ?? '').trim();
  }

  private resolveSubmittedAnswer(answer: SubmitAnswerInput): string {
    if (typeof answer?.answer !== 'undefined') {
      return answer.answer;
    }
    if (typeof answer?.userAnswer !== 'undefined') {
      return answer.userAnswer;
    }
    return '';
  }

  private async getExerciseMapForUser(
    connection: PoolConnection, 
    userId: number, 
    exerciseIds: string[]
  ): Promise<Map<string, ExerciseMapRow>> {
    const [exerciseRows] = await connection.query<ExerciseMapRow[]>(
      `SELECT ei.id AS instance_id, ei.exercise_id, ei.correct_answer, ei.phrase
       FROM exercise_instances ei
       INNER JOIN (
         SELECT exercise_id, MAX(created_at) AS latest_created_at
         FROM exercise_instances
         WHERE exercise_id IN (?) AND user_id = ?
         GROUP BY exercise_id
       ) latest
         ON latest.exercise_id = ei.exercise_id
        AND latest.latest_created_at = ei.created_at
      WHERE ei.exercise_id IN (?) AND ei.user_id = ?`,
      [exerciseIds, userId, exerciseIds, userId]
    );

    return new Map(exerciseRows.map(row => [row.exercise_id, row]));
  }

  public async checkExerciseAnswer(username: string, answer: SubmitAnswerInput): Promise<CheckAnswerResult | null> {
    const user = await this.getOrCreateUser(username);

    if (!answer?.exerciseId) {
      throw new Error('Nenhum exercicio valido informado.');
    }

    const connection = await databasePool.getConnection();
    try {
      const exerciseMap = await this.getExerciseMapForUser(connection, user.id, [answer.exerciseId]);
      const exerciseData = exerciseMap.get(answer.exerciseId);

      if (!exerciseData) {
        return null;
      }

      const userAnswer = this.resolveSubmittedAnswer(answer);
      const correctAnswer = this.normalizeAnswer(exerciseData.correct_answer);
      const isCorrect = this.normalizeAnswer(userAnswer) === correctAnswer;

      return {
        exerciseId: answer.exerciseId,
        correctAnswer,
        message: isCorrect ? 'Resposta correta.' : 'Resposta incorreta.'
      };
    } finally {
      connection.release();
    }
  }

  public async updateProgress(username: string, answers: SubmitAnswerInput[]): Promise<UpdateProgressResult> {
    const user = await this.getOrCreateUser(username);
    if (!Array.isArray(answers) || answers.length === 0) {
      return { accuracy: 0, newLevel: user.nivelAtual };
    }

    const exerciseIds = answers.map(answer => answer.exerciseId).filter(Boolean);
    if (exerciseIds.length === 0) {
      throw new Error('Nenhum exercício válido informado.');
    }

    const connection = await databasePool.getConnection();
    try {
      await connection.beginTransaction();
      const exerciseMap = await this.getExerciseMapForUser(connection, user.id, exerciseIds);

      let acertos = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;

      const resultValues = answers.map(answer => {
        const exerciseData = exerciseMap.get(answer.exerciseId);
        const userAnswer = this.resolveSubmittedAnswer(answer);

        let correct = false;
        if (exerciseData && typeof userAnswer !== 'undefined') {
          correct = this.normalizeAnswer(userAnswer) === this.normalizeAnswer(exerciseData.correct_answer);
        } else if (typeof answer.correct === 'boolean') {
          correct = answer.correct;
        }

        if (correct) {
          acertos += 1;
          totalCorrect += 1;
        } else {
          totalIncorrect += 1;
        }

        return [
          user.id,
          exerciseData?.instance_id ?? null,
          userAnswer !== undefined ? String(userAnswer) : null,
          correct ? 1 : 0
        ];
      });

      const validResultValues = resultValues.filter(resultValue => resultValue[1]);

      if (validResultValues.length > 0) {
        await connection.query(
          'INSERT INTO exercise_results (user_id, exercise_instance_id, user_answer, correct) VALUES ?',
          [validResultValues]
        );
      }

      for (const answer of answers) {
        const exerciseData = exerciseMap.get(answer.exerciseId);
        if (!exerciseData) continue;

        const phrase = exerciseData.phrase;
        const correct = resultValues.find(rv => rv[1] === exerciseData.instance_id)?.[3] === 1;
        const now = new Date();

        await connection.execute(
          `INSERT INTO user_phrase_progress 
             (user_id, phrase, wrong_count, correct_count, last_seen_at)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             wrong_count = wrong_count + IF(?, 1, 0),
             correct_count = correct_count + IF(?, 1, 0),
             last_seen_at = ?`,
          [
            user.id,
            phrase,
            correct ? 0 : 1,
            correct ? 1 : 0,
            now,
            !correct,
            correct,
            now
          ]
        );
      }

      const accuracyDecimal = answers.length > 0 ? acertos / answers.length : 0;
      const newLevel = this.calculateLevelProgression(user.nivelAtual, accuracyDecimal);
      const updatedCorrect = user.totalAcertos + totalCorrect;
      const updatedIncorrect = user.totalErros + totalIncorrect;

      await connection.query(
        'UPDATE user_progress SET current_level = ?, total_correct = ?, total_incorrect = ?, last_activity = ? WHERE user_id = ?',
        [newLevel, updatedCorrect, updatedIncorrect, new Date(), user.id]
      );

      await connection.commit();
      
      return {
        accuracy: Math.round(accuracyDecimal * 100),
        newLevel
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async getUserChatContext(username: string): Promise<ChatContext> {
    const user = await this.getOrCreateUser(username);

    const [incorrectRows] = await databasePool.query<PhraseRow[]>(
      `SELECT ei.phrase 
       FROM exercise_results er 
       JOIN exercise_instances ei ON er.exercise_instance_id = ei.id 
       WHERE er.user_id = ? AND er.correct = 0 
       GROUP BY ei.phrase 
       ORDER BY MAX(er.submitted_at) DESC LIMIT 5`,
      [user.id]
    );

    const [correctRows] = await databasePool.query<PhraseRow[]>(
      `SELECT ei.phrase 
       FROM exercise_results er 
       JOIN exercise_instances ei ON er.exercise_instance_id = ei.id 
       WHERE er.user_id = ? AND er.correct = 1 
       GROUP BY ei.phrase 
       ORDER BY COUNT(*) DESC LIMIT 5`,
      [user.id]
    );

    return {
      userLevel: user.nivelAtual,
      recentWords: [...incorrectRows.map(row => row.phrase), ...correctRows.map(row => row.phrase)],
      totalAcertos: user.totalAcertos,
      totalErros: user.totalErros
    };
  }

  public async getPhraseProgress(username: string, amount: number): Promise<PhraseProgressResult[]> {
    const query = `SELECT phrase, wrong_count, correct_count, last_seen_at
                   FROM user_phrase_progress UPP
                   INNER JOIN users u ON (UPP.user_id = u.id)
                   WHERE u.username = ?`;

    const [rows] = await databasePool.query<PhraseProgressRow[]>(query, [username]);
    
    return rows.map(x => {
      const diffMs = new Date().getTime() - new Date(x.last_seen_at).getTime();
      const seg_sem_ver = Math.floor(diffMs / 1000);
      const wrongCount = Number(x.wrong_count);
      const correctCount = Number(x.correct_count);
      const hasOnlyCorrectAnswers = wrongCount === 0 && correctCount > 0;
      const isInRecentCooldown = hasOnlyCorrectAnswers && seg_sem_ver < 300;
      const score = isInRecentCooldown ? -1 : (wrongCount * 2) + seg_sem_ver;

      return {
        phrase: x.phrase,
        wrong_count: wrongCount,
        correct_count: correctCount,
        last_seen_at: String(x.last_seen_at),
        score,
        seg_sem_ver,
        isInRecentCooldown
      };
    }).filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, amount);
  }
}