import { QuestionV1, ParsedWordData, QuestionCache } from "./questions.types.js";

export interface IQuestionsRepository {
  loadDataFromDisc(): Promise<void>;
  
  // Métodos V1 (Estrutura simples de cards)
  getQuestionsArray(): QuestionV1[];
  saveQuestionsArray(questions: QuestionV1[]): Promise<void>;
  
  // Métodos V2 (Cache estruturado por Nível -> Palavra)
  getCacheByNivel(nivel: string): Record<string, ParsedWordData> | undefined;
  getCacheComplete(): QuestionCache;
  saveCacheComplete(cache: QuestionCache): Promise<void>;
  updateNivelCache(nivel: string, word: string, data: ParsedWordData): Promise<void>;
  ensureNivelExists(nivel: string): Promise<void>;
}