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