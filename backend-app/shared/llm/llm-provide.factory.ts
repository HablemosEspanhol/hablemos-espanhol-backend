import { LLM_PROVIDER } from "../config/LLMConfig.js";
import { GeminiLLMProvider } from "./gemini.provider.js";
import { LocalOllama } from "./ollama.provider.js";

export function llmProviderFactory() {
    var llm = {
        'gemini': () => new GeminiLLMProvider(),
        'ollama': () => new LocalOllama()
    }[LLM_PROVIDER];

    if (!llm) {
        throw new Error(`LLM_PROVIDER unknown. value='${LLM_PROVIDER}'`)
    }
    return llm();
}