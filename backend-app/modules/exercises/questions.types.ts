// --- export interfaces de Tipagem ---
export interface QuestionV1 {
  front: string;
  back: string;
}

export interface Frase {
  texto: string;
  traduccion: string;
}

export interface ParsedWordData {
  palavra: string;
  frases: Frase[];
}

export interface QuestionCache {
  [nivel: string]: {
    [word: string]: ParsedWordData;
  };
}

export interface ExercisePhrase {
  palavra: string;
  texto: string;
  traduccion: string;
}

export interface LevelPhrase extends ExercisePhrase {
  id: string;
  nivel: string;
}

export interface WordReviewItem {
  phrase: string;
}

export interface PaginatedPhrasesResponse {
  level: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: LevelPhrase[];
}