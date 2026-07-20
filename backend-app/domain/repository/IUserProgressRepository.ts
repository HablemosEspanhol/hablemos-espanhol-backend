import { ChatContext } from "../models/chat.types.js";
import { UserProgress, ExerciseStoreInput, SubmitAnswerInput, CheckAnswerResult, UpdateProgressResult, PhraseProgressResult } from "../models/user-progress.types.js";

export interface IUserProgressRepository {
  getOrCreateUser(username: string): Promise<UserProgress>;
  getUserChatContext(username: string): Promise<ChatContext>;
  getUserLevel(username: string): Promise<string>;
  storeExercises(username: string, exercises: ExerciseStoreInput[]): Promise<void>;
  checkExerciseAnswer(username: string, answer: SubmitAnswerInput): Promise<CheckAnswerResult | null>;
  updateProgress(username: string, answers: SubmitAnswerInput[]): Promise<UpdateProgressResult>;
  getPhraseProgress(username: string, amount: number): Promise<PhraseProgressResult[]>;
  calculateLevelProgression(currentLevel: string, accuracy: number): string;
}