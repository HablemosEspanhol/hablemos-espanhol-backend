import { QuestionsService } from "./question.service.js";
import { ExercisePhraseInput, GeneratedExercise, PublicExercise, SubmitValidationResult } from "./exercises.types.js";
import { SubmitAnswerInput, CheckAnswerResult } from "../user/user-progress.types.js";
import { IUserProgressRepository } from "../user/iuser-progress.repository.js";
import { IExerciseRepository } from "./exercise.repository.js";
import { UserProgressService } from "../user/user-progress.service.js";

export interface CustomHttpError {
  status: number;
  error: string;
}

// --- Classe do Serviço ---
export class ExercisesService {
  constructor(
    private readonly exerciseRepository: IExerciseRepository,
    private readonly userProgressRepository: IUserProgressRepository,
    private readonly userProgressService: UserProgressService,
    private readonly questionsService: QuestionsService
  ) {}

  /**
   * Obtém e gera o conjunto de exercícios customizado baseado no nível e histórico do aluno.
   */
  public async getExercisesByUsername(username: string): Promise<PublicExercise[]> {
    const userLevel = await this.userProgressRepository.getUserLevel(username);
    const phrasesToReview = await this.userProgressService.getPhraseProgress(username, 5);
    
    const phrases = this.questionsService.getPhrasesForExercises(userLevel, 10, phrasesToReview);
    
    if (phrases.length < 10) {
      const fallbackPhrases = this.questionsService.getPhrasesForExercises('A1', 10);
      phrases.push(...fallbackPhrases.slice(0, 10 - phrases.length));
    }

    const exercises = this.exerciseRepository.generateExercises(phrases);
    await this.userProgressService.storeExercises(username, exercises);

    // Mapeia removendo dados confidenciais de validação interna
    const publicExercises = exercises.map(
      ({ correctAnswer, instanceId, ...exercise }) => exercise
    );
    
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