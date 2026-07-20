import { OLLAMA_URL } from "../config/LLMConfig.js";
import { LLMProvider, AiConfigBody, LLMResponse } from "./llm.types.js";

export class LocalOllama implements LLMProvider{
  public readonly model: string = "phi3:mini";
  private url: string = OLLAMA_URL;  

  private aiRequest(body: AiConfigBody): Promise<Response> {
    return fetch(this.url + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  public async generate(prompt: string, option: any){
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
}