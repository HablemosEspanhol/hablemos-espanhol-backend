import { QuestionsService } from "./question.service.js";
import { ExercisePhraseInput, GeneratedExercise, PublicExercise, SubmitValidationResult } from "./exercises.types.js";
import { SubmitAnswerInput, CheckAnswerResult } from "../user/user-progress.types.js";
import { IUserProgressRepository } from "../user/iuser-progress.repository.js";
import { IExerciseFactory } from "./exercise.factory.js";
import { UserProgressService } from "../user/user-progress.service.js";
import Logger from "../../shared/Logger.js";

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
    private readonly questionsService: QuestionsService
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
    if (result.accuracy >= 80) {
      message = `Excelente! ${result.accuracy}% correto. Parabéns, você subiu para ${result.newLevel}!`;
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
      message
    };
  }
}