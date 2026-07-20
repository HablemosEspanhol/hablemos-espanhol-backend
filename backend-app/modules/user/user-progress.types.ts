import { RowDataPacket } from "mysql2/promise";

export interface UserProgress {
  id: number;
  username: string;
  nivelAtual: string;
  totalAcertos: number;
  totalErros: number;
  ultimaAtividade: Date;
}

export interface ExerciseStoreInput {
  instanceId: string;
  id: string;
  palavra: string;
  type: string;
  correctAnswer: string;
}

export interface SubmitAnswerInput {
  exerciseId: string;
  answer?: string;
  userAnswer?: string;
  correct?: boolean;
}

export interface CheckAnswerResult {
  exerciseId: string;
  correctAnswer: string;
  message: string;
}

export interface UpdateProgressResult {
  accuracy: number;
  newLevel: string;
}

export interface PhraseProgressResult {
  phrase: string;
  wrong_count: number;
  correct_count: number;
  last_seen_at: string;
  score: number;
  seg_sem_ver: number;
  isInRecentCooldown: boolean;
}

export interface DbExerciseMapItem {
  instance_id: string;
  exercise_id: string;
  correct_answer: string;
  phrase: string;
}

export interface DbRawPhraseProgress {
  phrase: string;
  wrong_count: number;
  correct_count: number;
  last_seen_at: Date;
}

export interface UserProgressRow extends RowDataPacket {
  id: number;
  username: string;
  current_level: string;
  total_correct: number;
  total_incorrect: number;
  last_activity: string | Date;
}

export interface ExerciseMapRow extends RowDataPacket {
  instance_id: string;
  exercise_id: string;
  correct_answer: string;
  phrase: string;
}

export interface PhraseRow extends RowDataPacket {
  phrase: string;
}

export interface PhraseProgressRow extends RowDataPacket {
  phrase: string;
  wrong_count: string | number;
  correct_count: string | number;
  last_seen_at: string | Date;
}
