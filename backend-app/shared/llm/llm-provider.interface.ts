import { LLMProviderGenerateOptions, LLMResponse } from "./llm.types.js";

export interface LLMProvider {
  model: string;
  providerName: string;
  generate(prompt: string, options?: LLMProviderGenerateOptions): Promise<LLMResponse>
  /**
   * Executa uma requisição de geração de texto livre para interações abertas (como chat).
   * @param prompt O texto completo formatado contendo as instruções do sistema e fala do usuário.
   * @param options Configurações adicionais de variação como temperatura e limite de tokens.
   */
  generateText(
    prompt: string, 
    options?: LLMProviderGenerateOptions
  ): Promise<{ response: string }>;

  /**
   * Verifica se um modelo específico está baixado e disponível no Ollama local.
   * Retorna true se estiver disponível (ou se estiver rodando em modo Mock).
   */
  checkModels(model: string, isMock: boolean): Promise<boolean>;
}