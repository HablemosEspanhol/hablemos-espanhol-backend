// --- Interfaces adicionais do escopo de Exercises ---
export interface ExercisePhraseInput {
  palavra: string;
  texto: string;
  traduccion: string;
}

export interface ExercisePhraseInput {
  palavra: string;
  texto: string;
  traduccion: string;
}

export interface GeneratedExercise {
  id: string;
  instanceId: string;
  type: 'translation' | 'fill_blank' | 'multiple_choice';
  question: string;
  options?: (string | null)[] | null;
  correctAnswer: string;
  palavra: string;
}

// O que é retornado publicamente para o cliente (removendo correctAnswer e instanceId)
export interface PublicExercise {
  id: string;
  type: string;
  question: string;
  options?: string[] | null;
  palavra: string;
}

export interface SubmitValidationResult {
  accuracy: number;
  newLevel: string;
  message: string;
}
