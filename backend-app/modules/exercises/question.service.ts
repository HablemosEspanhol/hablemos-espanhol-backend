
import Logger from "../../shared/Logger.js";
import WordLoader from "../../shared/services/word-loader.js";
import { isMock } from "../../shared/config/cmd-args.config.js";
import { QuestionV1, ParsedWordData, Frase, WordReviewItem, ExercisePhrase, LevelPhrase } from "./questions.types.js";
import { IQuestionsRepository } from "./iquestions.repository.js";
import { LLMProvider } from "../../shared/llm/llm-provider.interface.js";

export class QuestionsService {
  constructor(
    private readonly repository: IQuestionsRepository,
    private readonly llm: LLMProvider
  ) {}

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getQuestions(amount: number): QuestionV1[] {
    const questions = this.repository.getQuestionsArray();
    const limit = questions.length >= amount ? amount : questions.length;
    const selectedQuestions: QuestionV1[] = [];

    while (selectedQuestions.length < limit) {
      const questionIndex = Math.floor(Math.random() * questions.length);
      const question = questions[questionIndex];
      if (!selectedQuestions.includes(question)) {
        selectedQuestions.push(question);
      }
    }
    return selectedQuestions;
  }

  public async executeFetch(): Promise<void> {
    Logger.info("[OLLAMA] Fazendo pooling de perguntas");
    const amountOfQuestionToPull = 3;
    
    const ollamaData = await this.llm.generate(
      `Retorne apenas JSON válido. Formato: [{"front": "palavra...", "back": "resposta..."}]. Gere ${amountOfQuestionToPull} exercícios...`,
      { num_predict: 150 }
    );

    const exercises = JSON.parse(ollamaData.response);
    const currentQuestions = [...this.repository.getQuestionsArray()];

    if (exercises.cards && Array.isArray(exercises.cards)) {
      currentQuestions.push(...exercises.cards);
    } else if (Array.isArray(exercises) && exercises.length > 0) {
      currentQuestions.push(...exercises);
    } else if (exercises.front) {
      currentQuestions.push(exercises as QuestionV1);
    } else {
      for (const key in exercises) {
        currentQuestions.push(exercises[key]);
      }
    }

    await this.repository.saveQuestionsArray(currentQuestions);
  }

  public async pollingQuestions(): Promise<void> {
    if (isMock) return;
    await this.pollingQuestionsByLevel();
  }

  private async pollingQuestionsByLevel(): Promise<void> {
    const niveis = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const words = await WordLoader.loadAll() as string[];
    const from = "espanhol";
    const to = "português";

    for (const nivel of niveis) {
      await this.repository.ensureNivelExists(nivel);
      const nivelCache = this.repository.getCacheByNivel(nivel) || {};

      for (const word of words) {
        if (!nivelCache[word]) {
          Logger.info(`Gerando Questões para a palavra ${word} no nivel ${nivel}`);
          const begin = Date.now();
          
          await this.generateQuestionsFromWord(word, nivel, from, to);
          
          const end = Date.now();
          const duration = (end - begin) / 1000 / 60;
          Logger.info(`Geradas Questões para a palavra ${word} no nivel ${nivel}. Duração: ${duration.toFixed(2)} min`);
          
          await this.delay(30 * 1000);
        }
      }
    }
  }

  public async generateQuestionsFromWord(
    word: string, 
    nivel: string, 
    idiomaFrase: string, 
    idiomaTraducao: string
  ): Promise<ParsedWordData | null> {
    const nivelCache = this.repository.getCacheByNivel(nivel);
    if (nivelCache && nivelCache[word]) {
      return nivelCache[word];
    }

    const prompt = `write 3 short phrases (limited to 80 chars) in ${idiomaFrase} with the word '${word}', concat ';', concat the traslation in '${idiomaTraducao}'. each phrase need to be separed by breakline '\n'`;
    let ollamaData: { response: string } | undefined;
    
    try {
      ollamaData = await this.llm.generate(prompt, { temperature: 0, "top_p": 0.1, "repeat_penalty": 1.2 });
      const response = ollamaData.response;

      if (!response.includes(";") || response.includes("}") || response.includes("{")) {
        throw new Error("resposta invalida: " + response);      
      }

      const frases: Frase[] = response
        .split('\n')
        .filter(l => l.includes(';'))
        .map(x => {
          let [texto, traduccion] = x.replaceAll('"', "").split(';');
          traduccion = traduccion.split('/')[0].trim();
          texto = (texto.includes(".") ? texto.split(".")[1] : texto).trim();
          return { texto, traduccion };
        });

      const parsed: ParsedWordData = { palavra: word, frases };
      
      if (parsed.palavra === word) {
        await this.repository.updateNivelCache(nivel, word, parsed);
        return parsed;
      }
      Logger.warning(`Palavra inválida retornada pela IA.`);
      return null;
    } catch (error) {
      Logger.error("Erro ao fazer parse da resposta:", error);
      return null;
    }
  }

  public async generateQuestionsFromWords(words: string[], nivel: string): Promise<unknown[]> {
    const limite = 3; 
    const resultados: unknown[] = [];
    let index = 0;

    await this.repository.ensureNivelExists(nivel);

    const worker = async (): Promise<void> => {
      while (index < words.length) {
        const i = index++;
        try {
          resultados[i] = await this.generateQuestionsFromWord(words[i], nivel, "spanish", "portuguese");
        } catch (err: any) {
          resultados[i] = { error: err.message };
        }
      }
    };

    await Promise.all(Array.from({ length: limite }, () => worker()));
    return resultados;
  }

  public getPhrasesForExercises(level: string, amount: number, wordsToReview: WordReviewItem[] = []): ExercisePhrase[] {
    const allPhrases: ExercisePhrase[] = [];
    const cacheComplete = this.repository.getCacheComplete();

    const appendLevel = (lvl: string): void => {
      const nivelData = cacheComplete[lvl];
      if (!nivelData) return;
      
      for (const word in nivelData) {
        const data = nivelData[word];
        if (data.frases) {
          data.frases.forEach(frase => {
            allPhrases.push({ palavra: data.palavra, texto: frase.texto, traduccion: frase.traduccion });
          });
        }
      }
    };

    appendLevel(level);

    if (allPhrases.length < amount) {
      Object.keys(cacheComplete).forEach(otherLvl => {
        if (otherLvl !== level) appendLevel(otherLvl);
      });
    }

    const filtered = allPhrases.filter(p => p?.texto?.trim() && p?.traduccion?.trim());
    const phrasesByWord = new Map<string, ExercisePhrase[]>();
    
    for (const phrase of filtered) {
      if (!phrasesByWord.has(phrase.palavra)) phrasesByWord.set(phrase.palavra, []);
      phrasesByWord.get(phrase.palavra)!.push(phrase);
    }

    const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);
    const shuffled = shuffle(filtered);
    const selected: ExercisePhrase[] = [];
    const seen = new Set<string>();

    for (const word of wordsToReview) {
      if (selected.length >= amount) break;
      const candidates = shuffle(phrasesByWord.get(word.phrase) || []);
      const match = candidates.find(c => !seen.has(`${c.texto}-${c.traduccion}`));
      if (match) {
        seen.add(`${match.texto}-${match.traduccion}`);
        selected.push(match);
      }
    }

    for (const phrase of shuffled) {
      if (selected.length >= amount) break;
      const key = `${phrase.texto}-${phrase.traduccion}`;
      if (!seen.has(key)) {
        seen.add(key);
        selected.push(phrase);
      }
    }
    return selected;
  }

  public getAllPhrasesForLevel(level: string): LevelPhrase[] {
    const phrases: LevelPhrase[] = [];
    const nivelCache = this.repository.getCacheByNivel(level);
    if (!nivelCache) return phrases;

    for (const word in nivelCache) {
      const data = nivelCache[word];
      if (data.frases && Array.isArray(data.frases)) {
        data.frases.forEach((frase, index) => {
          phrases.push({
            id: `${level}-${word}-${index}`,
            palavra: data.palavra,
            texto: frase.texto,
            traduccion: frase.traduccion,
            nivel: level
          });
        });
      }
    }
    return phrases;
  }
}