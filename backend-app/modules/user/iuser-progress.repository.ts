import { PoolConnection } from "mysql2/promise";
import { UserProgress, ExerciseStoreInput, SubmitAnswerInput, DbExerciseMapItem, DbRawPhraseProgress } from "./user-progress.types.js";

export interface IUserProgressRepository {
  getOrCreateUser(username: string): Promise<UserProgress>;
  getUserLevel(username: string): Promise<string>;
  storeExercises(userId: number, exercises: ExerciseStoreInput[]): Promise<void>;
  getExerciseMapForUser(userId: number, exerciseIds: string[]): Promise<Map<string, DbExerciseMapItem>>;
  getExerciseMapWithConnection(connection: PoolConnection, userId: number, exerciseIds: string[]): Promise<Map<string, DbExerciseMapItem>>;
  saveExerciseResultsAndProgress(
    userId: number,
    resultsToInsert: Array<[number, string | null, string | null, number]>,
    phraseProgressUpdates: Array<{ phrase: string; correct: boolean; now: Date }>
  ): Promise<void>;
  updateUserStats(userId: number, newLevel: string, totalCorrect: number, totalIncorrect: number): Promise<void>;
  getUserRecentPhrases(userId: number, correctStatus: number, limit: number): Promise<string[]>;
  getRawPhraseProgressList(username: string): Promise<DbRawPhraseProgress[]>;
}