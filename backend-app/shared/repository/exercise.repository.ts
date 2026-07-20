import crypto from 'crypto';

// --- Interfaces de Tipagem ---
export interface ExercisePhraseInput {
  palavra: string;
  texto: string;
  traduccion: string;
}

export interface GeneratedExercise {
  id: string;
  instanceId: string;
  type: 'translation' | 'fill_blank' | 'multiple_choice';
  question: string;
  options?: (string | null)[] | null;
  correctAnswer: string;
  palavra: string;
}

export interface IExerciseRepository {
  generateExercises(phrases: ExercisePhraseInput[]): GeneratedExercise[];
}

// --- Classe do Repositório ---
export class ExerciseRepository implements IExerciseRepository {
  constructor() {}

  /**
   * Cria um hash estável determinístico baseado nos dados da palavra.
   */
  public createStableExerciseId({ palavra }: { palavra: string }): string {
    const normalizedPayload = JSON.stringify({
      palavra: String(palavra ?? '').trim()
    });

    return crypto.createHash('sha256').update(normalizedPayload).digest('hex').slice(0, 36);
  }

  /**
   * Encapsula o mapeamento base injetando IDs e instâncias únicas em lote.
   */
  private buildExercise(payload: Omit<GeneratedExercise, 'id' | 'instanceId'>): GeneratedExercise {
    return {
      ...payload,
      id: this.createStableExerciseId(payload),
      instanceId: crypto.randomUUID()
    };
  }

  /**
   * Gera um conjunto balanceado de 10 exercícios variados a partir das frases fornecidas.
   */
  public generateExercises(phrases: ExercisePhraseInput[]): GeneratedExercise[] {
    const validPhrases = phrases.filter(
      phrase => phrase &&
        typeof phrase.texto === 'string' && phrase.texto.trim() &&
        typeof phrase.traduccion === 'string' && phrase.traduccion.trim()
    );

    if (validPhrases.length < 10) {
      throw new Error('Insufficient valid phrases for exercises');
    }

    const selectedPhrases = validPhrases.slice(0, 10);
    const exercises: GeneratedExercise[] = [];

    const types: ('translation' | 'fill_blank' | 'multiple_choice')[] = [
      'translation', 'translation', 'translation', 'translation',
      'fill_blank', 'fill_blank', 'fill_blank',
      'multiple_choice', 'multiple_choice', 'multiple_choice'
    ];

    // Embaralha o pool de tipos de exercícios
    const shuffledTypes = types.sort(() => Math.random() - 0.5);

    selectedPhrases.forEach((phrase, index) => {
      const type = shuffledTypes[index];
      let exercise: GeneratedExercise;

      if (type === 'translation') {
        exercise = this.createTranslationExercise(phrase);
      } else if (type === 'fill_blank') {
        exercise = this.createFillBlankExercise(phrase);
      } else {
        // Obtenção de alternativas incorretas com base nas outras traduções do lote
        const wrongOptionsSet = new Set<string>();
        selectedPhrases.forEach(p => {
          if (p !== phrase && p.traduccion && wrongOptionsSet.size < 3) {
            wrongOptionsSet.add(p.traduccion);
          }
        });
        const wrongOptions = Array.from(wrongOptionsSet);
        exercise = this.createMultipleChoiceExercise(phrase, wrongOptions);
      }
      
      exercises.push(exercise);
    });

    return exercises;
  }

  /**
   * Constrói um exercício clássico de tradução direta.
   */
  public createTranslationExercise(phrase: ExercisePhraseInput): GeneratedExercise {
    return this.buildExercise({
      palavra: phrase.palavra,
      type: 'translation',
      question: phrase.texto,
      correctAnswer: phrase.traduccion,
      options: null
    });
  }

  /**
   * Remove uma palavra aleatória da frase para criar um exercício de completar lacunas.
   */
  public createFillBlankExercise(phrase: ExercisePhraseInput): GeneratedExercise {
    const words = phrase.texto.split(' ');
    if (words.length < 2) {
      // Fallback caso a frase seja curta demais para sofrer omissão
      return this.createTranslationExercise(phrase);
    }
    const removeIndex = Math.floor(Math.random() * words.length);
    const removedWord = words[removeIndex];
    words[removeIndex] = '___';
    const question = words.join(' ');

    return this.buildExercise({
      palavra: phrase.palavra,
      type: 'fill_blank',
      question,
      correctAnswer: removedWord,
      options: null
    });
  }

  /**
   * Constrói um exercício de múltipla escolha com alternativas embaralhadas.
   */
  public createMultipleChoiceExercise(phrase: ExercisePhraseInput, wrongOptions: string[]): GeneratedExercise {
    const options: (string | null)[] = [phrase.traduccion, ...wrongOptions];
    
    // Completa o array até obter 4 alternativas
    while (options.length < 4) {
      options.push(null);
    }
    
    const shuffledOptions = options.slice(0, 4).sort(() => Math.random() - 0.5);

    return this.buildExercise({
      palavra: phrase.palavra,
      type: 'multiple_choice',
      question: phrase.texto,
      options: shuffledOptions,
      correctAnswer: phrase.traduccion
    });
  }
}

// Exportação no modelo Singleton para manter acoplamento limpo nas fábricas e DI
export default new ExerciseRepository();