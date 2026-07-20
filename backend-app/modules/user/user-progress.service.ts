import { ChatContext } from "../chat/chat.types.js";
import { IUserProgressRepository } from "./iuser-progress.repository.js";
import { 
  UserProgress, 
  ExerciseStoreInput, 
  SubmitAnswerInput, 
  CheckAnswerResult, 
  UpdateProgressResult, 
  PhraseProgressResult 
} from "./user-progress.types.js";

export class UserProgressService {
  private readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  constructor(private readonly repository: IUserProgressRepository) {}

  public calculateLevelProgression(currentLevel: string, accuracy: number): string {
    const currentIndex = this.levels.indexOf(currentLevel);
    if (accuracy >= 0.8) {
      return this.levels[Math.min(currentIndex + 1, this.levels.length - 1)];
    }
    if (accuracy <= 0.5) {
      return this.levels[Math.max(currentIndex - 1, 0)];
    }
    return currentLevel;
  }

  private normalizeAnswer(value: any): string {
    return String(value ?? '').trim();
  }

  private resolveSubmittedAnswer(answer: SubmitAnswerInput): string {
    if (typeof answer?.answer !== 'undefined') return answer.answer;
    if (typeof answer?.userAnswer !== 'undefined') return answer.userAnswer;
    return '';
  }

  public async getOrCreateUser(username: string): Promise<UserProgress> {
    return this.repository.getOrCreateUser(username);
  }

  public async getUserLevel(username: string): Promise<string> {
    return this.repository.getUserLevel(username);
  }

  public async storeExercises(username: string, exercises: ExerciseStoreInput[]): Promise<void> {
    if (!Array.isArray(exercises) || exercises.length === 0) return;

    const validExercises = exercises.filter(ex => ex && typeof ex.correctAnswer === 'string' && ex.correctAnswer.trim().length > 0);
    if (validExercises.length === 0) return;

    const user = await this.repository.getOrCreateUser(username);
    await this.repository.storeExercises(user.id, validExercises);
  }

  public async checkExerciseAnswer(username: string, answer: SubmitAnswerInput): Promise<CheckAnswerResult | null> {
    const user = await this.repository.getOrCreateUser(username);
    if (!answer?.exerciseId) throw new Error('Nenhum exercicio valido informado.');

    const exerciseMap = await this.repository.getExerciseMapForUser(user.id, [answer.exerciseId]);
    const exerciseData = exerciseMap.get(answer.exerciseId);
    if (!exerciseData) return null;

    const userAnswer = this.resolveSubmittedAnswer(answer);
    const correctAnswer = this.normalizeAnswer(exerciseData.correct_answer);
    const isCorrect = this.normalizeAnswer(userAnswer) === correctAnswer;

    return {
      exerciseId: answer.exerciseId,
      correctAnswer,
      message: isCorrect ? 'Resposta correta.' : 'Resposta incorreta.'
    };
  }

  public async updateProgress(username: string, answers: SubmitAnswerInput[]): Promise<UpdateProgressResult> {
    const user = await this.repository.getOrCreateUser(username);
    if (!Array.isArray(answers) || answers.length === 0) {
      return { accuracy: 0, newLevel: user.nivelAtual };
    }

    const exerciseIds = answers.map(ans => ans.exerciseId).filter(Boolean);
    if (exerciseIds.length === 0) throw new Error('Nenhum exercício válido informado.');

    const exerciseMap = await this.repository.getExerciseMapForUser(user.id, exerciseIds);
    
    let acertos = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    const now = new Date();

    const resultsToInsert: Array<[number, string | null, string | null, number]> = [];
    const phraseProgressUpdates: Array<{ phrase: string; correct: boolean; now: Date }> = [];

    answers.forEach(answer => {
      const exerciseData = exerciseMap.get(answer.exerciseId);
      const userAnswer = this.resolveSubmittedAnswer(answer);

      let correct = false;
      if (exerciseData && typeof userAnswer !== 'undefined') {
        correct = this.normalizeAnswer(userAnswer) === this.normalizeAnswer(exerciseData.correct_answer);
      } else if (typeof answer.correct === 'boolean') {
        correct = answer.correct;
      }

      if (correct) {
        acertos += 1;
        totalCorrect += 1;
      } else {
        totalIncorrect += 1;
      }

      if (exerciseData?.instance_id) {
        resultsToInsert.push([
          user.id,
          exerciseData.instance_id,
          userAnswer !== undefined ? String(userAnswer) : null,
          correct ? 1 : 0
        ]);
        
        phraseProgressUpdates.push({
          phrase: exerciseData.phrase,
          correct,
          now
        });
      }
    });

    // Delegando a gravação batch atômica ao repositório
    await this.repository.saveExerciseResultsAndProgress(user.id, resultsToInsert, phraseProgressUpdates);

    const accuracyDecimal = answers.length > 0 ? acertos / answers.length : 0;
    const newLevel = this.calculateLevelProgression(user.nivelAtual, accuracyDecimal);
    
    // Atualiza estatísticas consolidadas finais do aluno
    await this.repository.updateUserStats(
      user.id, 
      newLevel, 
      user.totalAcertos + totalCorrect, 
      user.totalErros + totalIncorrect
    );

    return {
      accuracy: Math.round(accuracyDecimal * 100),
      newLevel
    };
  }

  public async getUserChatContext(username: string): Promise<ChatContext> {
    const user = await this.repository.getOrCreateUser(username);
    
    const incorrectPhrases = await this.repository.getUserRecentPhrases(user.id, 0, 5);
    const correctPhrases = await this.repository.getUserRecentPhrases(user.id, 1, 5);

    return {
      userLevel: user.nivelAtual,
      recentWords: [...incorrectPhrases, ...correctPhrases],
      totalAcertos: user.totalAcertos,
      totalErros: user.totalErros
    };
  }

  /**
   * 🧠 Lógica do Algoritmo Spaced Repetition (Repetição Espaçada) isolada na camada de Serviço.
   */
  public async getPhraseProgress(username: string, amount: number): Promise<PhraseProgressResult[]> {
    const rawList = await this.repository.getRawPhraseProgressList(username);
    const nowTime = new Date().getTime();

    return rawList.map(x => {
      const diffMs = nowTime - x.last_seen_at.getTime();
      const seg_sem_ver = Math.floor(diffMs / 1000);
      const hasOnlyCorrectAnswers = x.wrong_count === 0 && x.correct_count > 0;
      const isInRecentCooldown = hasOnlyCorrectAnswers && seg_sem_ver < 300;
      
      // Cálculo de score algorítmico pura regra de negócio
      const score = isInRecentCooldown ? -1 : (x.wrong_count * 2) + seg_sem_ver;

      return {
        phrase: x.phrase,
        wrong_count: x.wrong_count,
        correct_count: x.correct_count,
        last_seen_at: x.last_seen_at.toISOString(),
        score,
        seg_sem_ver,
        isInRecentCooldown
      };
    }).filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, amount);
  }
}