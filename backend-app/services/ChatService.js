const ChatService = () => {
  const generateResponse = async (userMessage, context = {}) => {
    const { username = 'anonymous', userLevel = 'A1', recentWords = [] } = context;

    // Build context-aware prompt
    let systemPrompt = `Você é um tutor de espanhol amigável e paci...ente.
Nivel do usuário: ${userLevel}
Conversa com o usuário em português.

Instruções:
- Responda perguntas sobre espanhol
- Corrija erros de forma educada
- Use exemplos simples e claros
- Seja encorrajador
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
          model: 'phi3',
          prompt: prompt,
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
      const cleanedText = text.replace(/^[Tt]utor:\s*/, '').trim();

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

  const generateContextFromUserProgress = (userProgress, userResults) => {
    if (!userProgress) return {};

    // Get recent words where user struggled
    const recentErrors = userResults
      ?.slice(-20)
      .filter(r => !r.correct)
      .map(r => r.palavra)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5) || [];

    const recentCorrect = userProgress.wordsSeen
      ? Array.from(userProgress.wordsSeen.entries())
          .filter(([_, stats]) => stats.correct > 0)
          .sort((a, b) => b[1].correct - a[1].correct)
          .slice(0, 5)
          .map(([word]) => word)
      : [];

    return {
      userLevel: userProgress.nivelAtual,
      recentWords: [...recentErrors, ...recentCorrect],
      totalAcertos: userProgress.totalAcertos,
      totalErros: userProgress.totalErros
    };
  };

  return {
    generateResponse,
    generateContextFromUserProgress
  };
};

export default ChatService();
