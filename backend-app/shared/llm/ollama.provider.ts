import { OLLAMA_URL } from "../config/LLMConfig.js";
import { AiConfigBody, LLMResponse } from "../../domain/models/llm.types.js";
import { LLMProvider } from "../../domain/services/LLMProvider.js";

export class LocalOllama implements LLMProvider {
  
  public readonly model: string = "phi3:mini";
  private url: string = OLLAMA_URL;  

  private aiRequest(body: AiConfigBody): Promise<Response> {
    return fetch(this.url + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  public async generate(prompt: string, option: any): Promise<LLMResponse> {
    const aiBody: AiConfigBody = {
      model: this.model,
      stream: false,
      format: "json",
      options: { ...option },
      prompt
    };

    const ollamaResponse = await this.aiRequest(aiBody);
    const ollamaData = await ollamaResponse.json() as LLMResponse;
    return ollamaData;
  }

  /**
   * 💡 Implementação do generateText
   * Geração de texto livre ideal para fluxos abertos como o chat do tutor de IA.
   */
  public async generateText(
    prompt: string, 
    option?: { temperature?: number; top_p?: number; num_predict?: number }
  ): Promise<LLMResponse> {
    const aiBody: AiConfigBody = {
      model: this.model,
      stream: false,
      // Omitimos o format: "json" para permitir texto puro/livre
      options: { ...option },
      prompt
    };

    const ollamaResponse = await this.aiRequest(aiBody);
    
    if (!ollamaResponse.ok) {
      throw new Error(`LocalOllama HTTP Error: ${ollamaResponse.statusText}`);
    }

    const ollamaData = await ollamaResponse.json() as LLMResponse;
    return ollamaData;
  }
}