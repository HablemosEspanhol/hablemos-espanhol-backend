import crypto from 'crypto';

function generateExercises(phrases) {
  const validPhrases = phrases.filter(
    phrase => phrase &&
      typeof phrase.texto === 'string' && phrase.texto.trim() &&
      typeof phrase.traduccion === 'string' && phrase.traduccion.trim()
  );

  if (validPhrases.length < 10) {
    throw new Error('Insufficient valid phrases for exercises');
  }

  const selectedPhrases = validPhrases.slice(0, 10);
  const exercises = [];

  const types = ['translation', 'translation', 'translation', 'translation',
                 'fill_blank', 'fill_blank', 'fill_blank',
                 'multiple_choice', 'multiple_choice', 'multiple_choice'];

  // Shuffle types
  const shuffledTypes = types.sort(() => Math.random() - 0.5);

  selectedPhrases.forEach((phrase, index) => {
    const type = shuffledTypes[index];
    let exercise;
    if (type === 'translation') {
      exercise = createTranslationExercise(phrase);
    } else if (type === 'fill_blank') {
      exercise = createFillBlankExercise(phrase);
    } else if (type === 'multiple_choice') {
      // Wrong options from other phrases' traduccion
      const wrongOptionsSet = new Set();
      selectedPhrases.forEach(p => {
        if (p !== phrase && p.traduccion && wrongOptionsSet.size < 3) {
          wrongOptionsSet.add(p.traduccion);
        }
      });
      const wrongOptions = Array.from(wrongOptionsSet);
      exercise = createMultipleChoiceExercise(phrase, wrongOptions);
    }
    exercises.push(exercise);
  });

  // Shuffle exercises
  return exercises.sort(() => Math.random() - 0.5);
}

function createTranslationExercise(phrase) {
  return {
    id: crypto.randomUUID(),
    palavra: phrase.palavra,
    type: 'translation',
    question: phrase.texto,
    correctAnswer: phrase.traduccion
  };
}

function createFillBlankExercise(phrase) {
  const words = phrase.texto.split(' ');
  if (words.length < 2) {
    // If only one word, can't remove, fallback to translation
    return createTranslationExercise(phrase);
  }
  const removeIndex = Math.floor(Math.random() * words.length);
  const removedWord = words[removeIndex];
  words[removeIndex] = '___';
  const question = words.join(' ');
  return {
    id: crypto.randomUUID(),
    palavra: phrase.palavra,
    type: 'fill_blank',
    question,
    correctAnswer: removedWord
  };
}

function createMultipleChoiceExercise(phrase, wrongOptions) {
  // Ensure we have exactly 3 wrong options
  const options = [phrase.traduccion, ...wrongOptions];
  // Pad with null if needed
  while (options.length < 4) {
    options.push(null);
  }
  // Shuffle options
  const shuffledOptions = options.slice(0, 4).sort(() => Math.random() - 0.5);
  return {
    id: crypto.randomUUID(),
    palavra: phrase.palavra,
    type: 'multiple_choice',
    question: phrase.texto,
    options: shuffledOptions,
    correctAnswer: phrase.traduccion
  };
}

function ExerciseService() {
  return {
    generateExercises,
    createTranslationExercise,
    createFillBlankExercise,
    createMultipleChoiceExercise
  };
}

export default ExerciseService();