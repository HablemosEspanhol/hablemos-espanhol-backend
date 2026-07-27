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

export interface LLMResponse { response: string }

// --- Interfaces de Tipagem do Ollama ---
export interface LLMModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
}

export interface LLMModelItem {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: LLMModelDetails;
}

export interface LLMTagsResponse {
  models: LLMModelItem[];
}


export interface LLMProviderGenerateOptions { 
  temperature?: number; 
  top_p?: number; 
  num_predict?: number,
  repeat_penalty?: number,
}
