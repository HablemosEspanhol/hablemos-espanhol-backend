import { GEMINI_API_KEY } from "../config/LLMConfig.js";
import Logger from "../Logger.js";
import { LLMProvider } from "./llm-provider.interface.js";
import { LLMProviderGenerateOptions, LLMResponse } from "./llm.types.js";

const BASE_TIMEOUT = 1000;
const ONE_SECOND = 1000;

export class GeminiLLMProvider implements LLMProvider {
    
    public readonly model: string = "gemini-flash-latest";
    public readonly providerName: string = this.constructor.name;
    private baseAddress = "https://generativelanguage.googleapis.com";
    private _apiKey: string = GEMINI_API_KEY;
    timeoutMs: number = BASE_TIMEOUT;
    async generate(prompt: string, option: LLMProviderGenerateOptions): Promise<LLMResponse> {
        var url = `${this.baseAddress}/v1beta/models/${this.model}:generateContent?key=${this._apiKey}`;
        var payload = {
            // systemInstruction: {
            //      parts: [{
            //         text : "You are an assistant that will be used to act as generator of phrases in "
            //     }]
            // },
            contents: [
                {

                    role: "user",
                    parts: [{
                        text: prompt
                    }]
                }
            ],
            generationConfig: {
                temperature: option?.temperature,
                topP: option?.top_p,
                maxOutputTokens: option?.num_predict,
                // frequencyPenalty: option?.repeat_penalty,
            }
        };
        await this.applyToManyRequestProtection();
        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        this.checkError(response.status, data);

        if (!response.ok) {
            throw this.errorHandler(response, data);
        }        

        // O texto retornado fica dentro deste caminho:
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        return {
            // Mapeie aqui para a sua interface LLMResponse, por exemplo:
            response: generatedText
        };
    }

    applyToManyRequestProtection() {
        Logger.warning(`[${this.providerName}] Awaiting ${this.timeoutMs} ms...`);
        new Promise((resolve) => setTimeout(resolve, this.timeoutMs));
    }

    /**
 * 💡 Implementação do generateText para Gemini
 * Geração de texto livre padronizada com a interface do Ollama Provider.
 */
    public async generateText(
        prompt: string,
        option?: LLMProviderGenerateOptions
    ): Promise<LLMResponse> {
        const url = `${this.baseAddress}/v1beta/models/${this.model}:generateContent?key=${this._apiKey}`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            // Mapeamento das opções para o padrão que a API do Gemini entende
            generationConfig: {
                temperature: option?.temperature,
                topP: option?.top_p,
                maxOutputTokens: option?.num_predict,
                // frequencyPenalty: option?.repeat_penalty,
            }
        };
        
        await this.applyToManyRequestProtection();
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const geminiData = await response.json();

        this.checkError(response.status, geminiData);

        if (!response.ok) {
            throw this.errorHandler(response, geminiData);
        }        

        // Extrai o texto gerado do formato específico do Gemini
        const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        // Retorna no mesmo contrato/formato de LLMResponse usado no Ollama
        return {
            response: textOutput,
            done: true
            // adicione outros campos da sua LLMResponse se houver (ex: model, created_at, etc.)
        } as LLMResponse;
    }

    errorHandler(response: Response, errorData: any) {
        Logger.error(`[${this.providerName}] Gemini API Error Details:`, JSON.stringify(errorData));
        return new Error(`${response.status}: ${response.statusText}`);
    }

    public async checkModels(model: string, isMock: boolean): Promise<boolean> {
        try {
            if (isMock) {
                return true;
            }

            Logger.info(`[${this.providerName}] Checking IA model ${model}`);
            Logger.error(`[${this.providerName}] Gemini API Key size : ${this._apiKey.length}`);

            await this.applyToManyRequestProtection();
            const res = await fetch(`${this.baseAddress}/v1beta/models?key=${this._apiKey}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json() as { models?: Array<{ name: string; displayName?: string }> };

            this.checkError(res.status, data);

            if (!res.ok) {
               this.errorHandler(res, data);
               return false;
            }

            

            if (data.models && Array.isArray(data.models)) {
                // O Gemini retorna o nome no formato "models/gemini-2.5-flash"
                // Aqui testamos tanto o nome completo/parcial quanto o displayName

                Logger.info(`[${this.providerName}] Gemini Models:`, data.models.map(x=>x.name.replace("models/", "")));
                return data.models.some(
                    (m) =>
                        m.name.includes(model) ||
                        m.name.replace("models/", "") === model ||
                        (m.displayName && m.displayName.toLowerCase().includes(model.toLowerCase()))
                );
            }

            return false;
        } catch (error: any) {
            Logger.warning(`[${this.providerName}] Gemini failed to check availability:`, error.message || error);
            return false;
        }
    }

    private checkError(status: number, json: any) {
        if(status >= 400){            
            this.timeoutMs = BASE_TIMEOUT * 2;
        } if(status == 429) {
            this.timeoutMs =  this.timeoutMs * this.timeoutMs;
            if(json) {
                var delay = json.error.details.find((x:any)=> x["@type"] == "type.googleapis.com/google.rpc.RetryInfo").retryDelay;                
                var delayMs = Number(delay.replace("s", "")) * ONE_SECOND;
                this.timeoutMs = delayMs + BASE_TIMEOUT;
                Logger.warning(`[${this.providerName}] Rate limit excedido (429). Aguardando ${this.timeoutMs / ONE_SECOND}s para tentar novamente...`);                
            }
        }
        else {
            this.timeoutMs = 100;
        }

    }
}