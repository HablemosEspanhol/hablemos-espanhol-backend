import { OLLAMA_URL } from "../config/LLMConfig.js";
import { AiConfigBody, LLMResponse, LLMTagsResponse } from "./llm.types.js";
import { LLMProvider } from "./llm-provider.interface.js";
import Logger from "../Logger.js";

export class LocalOllama implements LLMProvider {
  
  public readonly model: string = "phi3:mini";
  private url: string = OLLAMA_URL;
  public readonly providerName: string = this.constructor.name;

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

  public async checkModels(model: string, isMock: boolean): Promise<boolean> {
    try {
      if (isMock) {
        return true;
      }

      Logger.info(`Checking IA model ${model}`);

      const res = await fetch(`${this.url}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Ollama tags endpoint error: ${res.statusText}`);
      }

      const data = await res.json() as LLMTagsResponse;
      Logger.info("OllamaChecker raw metadata output:", data);

      // Uma abordagem mais segura e tipada do que usar stringify genérico:
      // Verifica tanto pelo nome amigável (name) quanto pela tag exata (model)
      if (data.models && Array.isArray(data.models)) {
        return data.models.some(
          (m) => m.name.includes(model) || m.model.includes(model)
        );
      }

      return false;
    } catch (error: any) {
      Logger.warning("OllamaChecker failed to check availability:", error.message || error);
      return false;
    }
  }
}