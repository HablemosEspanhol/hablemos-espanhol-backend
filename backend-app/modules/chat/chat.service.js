const ChatService = () => {
  const generateResponse = async (userMessage, context = {}) => {
    const { username = 'anonymous', userLevel = 'A1', recentWords = [] } = context;

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
      const response = await fetch('http://ollama:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'phi3',
          prompt,
          stream: false,
          temperature: 0.7,
          top_p: 0.9,
          options: {
            num_predict: 150
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.response || '';
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
    } catch (error) {
      return {
        success: false,
        message: 'Desculpe, não consegui gerar uma resposta. Tente novamente.',
        error: error.message,
        username,
        timestamp: new Date()
      };
    }
  };

  const generateContextFromUserProgress = (progressContext = {}) => {
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
  };

  return {
    generateResponse,
    generateContextFromUserProgress
  };
};

export default ChatService();
