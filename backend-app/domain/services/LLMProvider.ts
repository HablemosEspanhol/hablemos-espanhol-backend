import { LLMResponse } from "../models/llm.types.js";

export interface LLMProvider {
  model: string;
  generate(prompt: string, option: any): Promise<LLMResponse>
  /**
   * Executa uma requisição de geração de texto livre para interações abertas (como chat).
   * @param prompt O texto completo formatado contendo as instruções do sistema e fala do usuário.
   * @param options Configurações adicionais de variação como temperatura e limite de tokens.
   */
  generateText(
    prompt: string, 
    options?: { temperature?: number; top_p?: number; num_predict?: number }
  ): Promise<{ response: string }>;
}