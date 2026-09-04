import { QuestionsService } from "./question.service.js";
import { ExercisePhraseInput, GeneratedExercise, PublicExercise, SubmitValidationResult } from "./exercises.types.js";
import { SubmitAnswerInput, CheckAnswerResult } from "../user/user-progress.types.js";
import { IUserProgressRepository } from "../user/iuser-progress.repository.js";
import { IExerciseFactory } from "./exercise.factory.js";
import { UserProgressService } from "../user/user-progress.service.js";
import Logger from "../../shared/Logger.js";
import { ExerciseV3Repository, GeneratedExerciseRecord } from "./exercise-v3.repository.js";

export interface CustomHttpError {
  status: number;
  error: string;
}

// --- Classe do Serviço ---
export class ExercisesService {

  private minimunExerciseAmount = 10;
  
  constructor(
    private readonly exerciseFactory: IExerciseFactory,
    private readonly userProgressRepository: IUserProgressRepository,
    private readonly userProgressService: UserProgressService,
    private readonly questionsService: QuestionsService,
    private readonly exerciseV3Repository: ExerciseV3Repository = new ExerciseV3Repository()
  ) {}

  public async getExercisesByUsernameUsingAI(username: string): Promise<PublicExercise[]> {
    const userLevel = await this.userProgressRepository.getUserLevel(username);
    
    // 1. Tenta gerar frases com IA
    let phrases = await this.questionsService.generatePhrasesFromWordsUsingAI(
      userLevel,
      this.minimunExerciseAmount
    );

    // 2. Fallback 1: Se IA não conseguir, tenta cache do nível do usuário
    if (phrases.length < this.minimunExerciseAmount) {
      const cachePhrases = this.questionsService.getPhrasesForExercises(
        userLevel,
        this.minimunExerciseAmount
      );
      phrases.push(...cachePhrases.slice(0, this.minimunExerciseAmount - phrases.length));
    }

    // 3. Fallback 2: Se ainda insuficiente, tenta outros níveis
    if (phrases.length < this.minimunExerciseAmount) {
      const niveis = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      for (const nivel of niveis) {
        if (nivel === userLevel) continue; // Já tentou
        const fallbackPhrases = this.questionsService.getPhrasesForExercises(
          nivel,
          this.minimunExerciseAmount
        );
        phrases.push(...fallbackPhrases.slice(0, this.minimunExerciseAmount - phrases.length));
        
        if (phrases.length >= this.minimunExerciseAmount) break;
      }
    }

    // 4. Se ainda não tiver o mínimo, lança erro
    if (phrases.length < this.minimunExerciseAmount) {
      throw {
        status: 500,
        error: `Insufficient phrases available even with fallback (got ${phrases.length}, needed ${this.minimunExerciseAmount})`
      } as CustomHttpError;
    }

    // 5. Gera exercícios com as frases coletadas
    const exercises = this.exerciseFactory.generateExercises(phrases);
    
    // 6. Armazena para histórico do usuário
    await this.userProgressService.storeExercises(username, exercises);

    // 7. Retorna resposta pública (sem dados sensíveis)
    const publicExercises = exercises.map(
      ({ correctAnswer, instanceId, ...exercise }) => exercise
    );
    
    return publicExercises as PublicExercise[];
  }


  /**
   * Obtém e gera o conjunto de exercícios customizado baseado no nível e histórico do aluno.
   */
  public async getExercisesByUsername(username: string): Promise<PublicExercise[]> {
    const userLevel = await this.userProgressRepository.getUserLevel(username);
    Logger.info("1. User Level="+userLevel);
    const phrasesToReview = await this.userProgressService.getPhraseProgress(username, 5);
    Logger.info("2. phrasesToReview=");
    const phrases = this.questionsService.getPhrasesForExercises(userLevel, this.minimunExerciseAmount, phrasesToReview);
    Logger.info("3. getPhrasesForExercises=");
    
    if (phrases.length < this.minimunExerciseAmount) {      
      const fallbackPhrases = this.questionsService.getPhrasesForExercises('A1', this.minimunExerciseAmount);
      phrases.push(...fallbackPhrases.slice(0, this.minimunExerciseAmount - phrases.length));
      Logger.info("3.2 fallback if phrases.length < this.minimunExerciseAmount", phrases);
    }

    const exercises = this.exerciseFactory.generateExercises(phrases);
    Logger.info("4. generateExercises=");
    await this.userProgressService.storeExercises(username, exercises);
    Logger.info("5. storeExercises");

    // Mapeia removendo dados confidenciais de validação interna
    const publicExercises = exercises.map(
      ({ correctAnswer, instanceId, ...exercise }) => exercise
    );

    Logger.info("6.  Mapeia removendo dados confidenciais de validação interna. publicExercises=", publicExercises);
    
    return publicExercises as PublicExercise[];
  }

  public async getExercisesV3(username: string): Promise<PublicExercise[]> {
    const userLevel = await this.userProgressRepository.getUserLevel(username);
    const existing = await this.exerciseV3Repository.listGeneratedExercises();
    if (existing.length >= 10) {
      return existing.slice(0, 10).map(item => ({
        id: item.id,
        type: "translation",
        question: item.texto,
        options: null,
        palavra: item.palavra
      }));
    }

    const generated = await this.generateExercisesV3WithLLM(username);
    if (generated.length > 0) {
      await this.exerciseV3Repository.saveGeneratedExercises(generated);
    }

    const phrasesFallback = this.buildFallbackExercisesV3FromExistingPhrases(username, userLevel);
    const source = generated.length >= 10
      ? generated
      : phrasesFallback.length >= 10
        ? phrasesFallback
        : this.buildFallbackExercisesV3(username);

    if (generated.length < 10 && source.length > 0) {
      await this.exerciseV3Repository.saveGeneratedExercises(source);
    }

    return source.slice(0, 10).map(item => ({
      id: item.id,
      type: "translation",
      question: item.texto,
      options: null,
      palavra: item.palavra
    }));
  }

  private async generateExercisesV3WithLLM(username: string): Promise<GeneratedExerciseRecord[]> {
    const prompt = `
Retorne apenas JSON válido.
Gere exatamente 10 itens para um exercício de tradução em espanhol.

Formato exato:
[
  {
    "palavra": "tema curto",
    "texto": "frase em espanhol",
    "traduccion": "tradução em português"
  }
]

Regras:
- frases curtas e naturais
- contexto de viagem e sobrevivência cotidiana
- variação entre saudações, direções, restaurante, compras e transporte
- não inclua explicações, markdown ou texto fora do JSON
- cada item deve ser único
- personalize levemente para o usuário ${username}
`.trim();

    const rawResponse = await this.questionsService.generateText(prompt, {
      temperature: 0.2,
      top_p: 0.8,
      num_predict: 1200
    });

    const raw = rawResponse.trim();
    const parsed = this.parseV3Payload(raw);
    if (parsed.length >= 10) {
      return parsed.slice(0, 10).map((item, index) => ({
        id: `${username}-${Date.now()}-${index}`,
        palavra: String(item.palavra ?? '').trim(),
        texto: String(item.texto ?? '').trim(),
        traduccion: String(item.traduccion ?? '').trim()
      })).filter(item => item.palavra && item.texto && item.traduccion);
    }

    Logger.warning(`[ExercisesService] v3 payload inválido ou insuficiente, usando fallback determinístico`);
    return this.buildFallbackExercisesV3(username);
  }

  private buildFallbackExercisesV3FromExistingPhrases(username: string, userLevel: string): GeneratedExerciseRecord[] {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const orderedLevels = [userLevel, ...levels.filter(level => level !== userLevel)];
    const phrases: Array<{ palavra: string; texto: string; traduccion: string }> = [];

    for (const level of orderedLevels) {
      const levelPhrases = this.questionsService.getPhrasesForExercises(level, this.minimunExerciseAmount);
      for (const phrase of levelPhrases) {
        if (phrases.length >= 10) break;
        if (!phrase.texto || !phrase.traduccion) continue;
        phrases.push({
          palavra: phrase.palavra,
          texto: phrase.texto,
          traduccion: phrase.traduccion
        });
      }
      if (phrases.length >= 10) break;
    }

    return phrases.slice(0, 10).map((item, index) => ({
      id: `${username}-phrases-${index}`,
      ...item
    }));
  }

  private parseV3Payload(raw: string): Array<{ palavra: string; texto: string; traduccion: string }> {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed?.items && Array.isArray(parsed.items)) {
        return parsed.items;
      }
      if (parsed?.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    } catch {
      // fallback below
    }
    return [];
  }

  private buildFallbackExercisesV3(username: string): GeneratedExerciseRecord[] {
    const base = [
      { palavra: "hola", texto: "Hola, ¿cómo estás?", traduccion: "Olá, como você está?" },
      { palavra: "dirección", texto: "¿Dónde queda la estación?", traduccion: "Onde fica a estação?" },
      { palavra: "restaurante", texto: "Quisiera una mesa para dos, por favor.", traduccion: "Gostaria de uma mesa para dois, por favor." },
      { palavra: "compras", texto: "¿Cuánto cuesta esta camisa?", traduccion: "Quanto custa esta camisa?" },
      { palavra: "transporte", texto: "Necesito un taxi para el aeropuerto.", traduccion: "Preciso de um táxi para o aeroporto." },
      { palavra: "ayuda", texto: "No entiendo, ¿puede repetir?", traduccion: "Não entendo, pode repetir?" },
      { palavra: "hotel", texto: "Tengo una reserva a nombre de Ana.", traduccion: "Tenho uma reserva no nome de Ana." },
      { palavra: "salud", texto: "Me duele la cabeza y tengo fiebre.", traduccion: "Estou com dor de cabeça e febre." },
      { palavra: "mercado", texto: "Voy a llevar dos kilos de manzanas.", traduccion: "Vou levar dois quilos de maçãs." },
      { palavra: "despedida", texto: "Muchas gracias, hasta luego.", traduccion: "Muito obrigado, até logo." }
    ];

    return base.map((item, index) => ({
      id: `${username}-fallback-${index}`,
      ...item
    }));
  }

  /**
   * Valida uma única resposta pontual de exercício (gabarito imediato)
   */
  public async checkOneExercise(username: string, answer: SubmitAnswerInput): Promise<CheckAnswerResult> {
    const hasUserAnswer = answer && (
      typeof answer.answer !== 'undefined' ||
      typeof answer.userAnswer !== 'undefined'
    );

    if (!username || !answer?.exerciseId || !hasUserAnswer) {
      throw { status: 400, error: 'Invalid request body' } as CustomHttpError;
    }

    const result = await this.userProgressService.checkExerciseAnswer(username, answer);

    if (!result) {
      throw { status: 404, error: 'Exercise not found for user' } as CustomHttpError;
    }

    return result;
  }

  /**
   * Processa uma lista de respostas submetidas, atualiza as estatísticas e calcula a progressão de nível.
   */
  public async validateExercise(username: string, answers: SubmitAnswerInput[]): Promise<SubmitValidationResult> {
    const invalidAnswer = Array.isArray(answers)
      ? answers.some(answer => 
          !answer || 
          !answer.exerciseId || 
          (typeof answer.answer === 'undefined' && 
           typeof answer.userAnswer === 'undefined' && 
           typeof answer.correct === 'undefined')
        )
      : true;

    if (!username || !answers || !Array.isArray(answers) || invalidAnswer) {
      throw { 
        status: 400,
        error: 'Invalid request body'
      } as CustomHttpError;
    }

    const result = await this.userProgressService.updateProgress(username, answers);

    let message = '';
    let lessonCompleted = false;
    if (result.accuracy >= 80) {
      message = `Excelente! ${result.accuracy}% correto. Parabéns, você subiu para ${result.newLevel}!`;
      lessonCompleted = true;
    } else if (result.accuracy >= 60) {
      message = `Bom! ${result.accuracy}% correto. Continue praticando no nível ${result.newLevel}.`;
    } else if (result.accuracy >= 50) {
      message = `Você acertou ${result.accuracy}%. Continue tentando no nível ${result.newLevel}.`;
    } else {
      message = `${result.accuracy}% correto. Você desceu para ${result.newLevel}. Tente novamente!`;
    }

    return {
      accuracy: result.accuracy,
      newLevel: result.newLevel,
      message,
      lessonCompleted
    };
  }
}
