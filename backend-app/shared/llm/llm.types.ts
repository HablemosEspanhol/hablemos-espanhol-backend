export interface AiConfigBody {
  model: string;
  stream: boolean;
  format?: string;
  options: {
    num_predict?: number;
    temperature?: number;
    top_p?: number;
    repeat_penalty?: number;
  };
  prompt: string;
}

export interface LLMProvider {
  generate(prompt: string, option: any): Promise<LLMResponse>
}

export interface LLMResponse { response: string }

