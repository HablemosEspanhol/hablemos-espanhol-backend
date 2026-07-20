import { ChatContext, ChatServiceResponse } from "../../domain/models/chat.types.js";
import { LLMProvider } from "../../domain/services/LLMProvider.js";

export class ChatService {
  // O serviço consome o contrato do provedor injetado
  constructor(private readonly llm: LLMProvider) {}

  /**
   * Coordena as regras do tutor de IA e solicita a resposta do modelo.
   */
  public async generateResponse(
    userMessage: string, 
    context: ChatContext = {}
  ): Promise<ChatServiceResponse> {
    const { 
      username = "anonymous", 
      userLevel = "A1", 
      recentWords = [] 
    } = context;

    let systemPrompt = `Você é um tutor de espanhol amigável e paciente.
Nivel do usuário: ${userLevel}
Conversa com o usuário em português.

Instruções:
- Responda perguntas sobre espanhol
- Corrija erros de forma educada
- Use exemplos simples e claros
- Seja encorajador
- Se o usuário escrever em espanhol, elogie e corrija se necessário`;

    if (recentWords.length > 0) {
      systemPrompt += `\n\nPalavras recentes do usuário: ${recentWords.join(', ')}`;
    }

    const prompt = `${systemPrompt}\n\nUsuário: ${userMessage}\n\nTutor:`;

    try {
      // Delegação de infraestrutura para o provedor de LLM
      const ollamaData = await this.llm.generateText(prompt, {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 150
      });

      const text = ollamaData.response || '';
      
      // Limpeza estrita dos delimitadores textuais retornados
      let cleanedText = text.replace(/^[Tt]utor:\s*/, '').trim();
      cleanedText = cleanedText
        .replace(/\\n/g, ' ')
        .replace(/\r?\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        success: true,
        message: cleanedText,
        username,
        userLevel,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Desculpe, não consegui gerar uma resposta. Tente novamente.',
        error: error.message,
        username,
        timestamp: new Date()
      };
    }
  }

  /**
   * Mapeia os dados de evolução do aluno para contexto de conversação.
   */
  public generateContextFromUserProgress(progressContext: ChatContext = {}): ChatContext {
    const { 
      userLevel = 'A1', 
      recentWords = [], 
      totalAcertos = 0, 
      totalErros = 0 
    } = progressContext;

    return {
      userLevel,
      recentWords,
      totalAcertos,
      totalErros
    };
  }
}