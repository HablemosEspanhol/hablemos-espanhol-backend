import { isMock } from "../config/cmd-args.config.js";
import Logger from "../Logger.js";
import { OLLAMA_URL } from "../config/LLMConfig.js";

// --- Interfaces de Tipagem do Ollama ---
interface OllamaModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
}

interface OllamaModelItem {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

interface OllamaTagsResponse {
  models: OllamaModelItem[];
}

// --- Classe do Verificador ---
export class OllamaChecker {
  constructor(
    private readonly ollamaUrl: string = OLLAMA_URL
  ) {}

  /**
   * Verifica se um modelo específico está baixado e disponível no Ollama local.
   * Retorna true se estiver disponível (ou se estiver rodando em modo Mock).
   */
  public async checkModels(model: string): Promise<boolean> {
    try {
      if (isMock) {
        return true;
      }

      Logger.info(`Checking IA model ${model}`);

      const res = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Ollama tags endpoint error: ${res.statusText}`);
      }

      const data = await res.json() as OllamaTagsResponse;
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

// Exporta como Singleton mantendo compatibilidade com as chamadas no server.js
export default new OllamaChecker();