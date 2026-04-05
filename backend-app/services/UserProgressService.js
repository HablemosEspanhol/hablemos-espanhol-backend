// In-memory storage for user progress
const userProgress = new Map(); // username -> {nivelAtual, totalAcertos, totalErros, ultimaAtividade, wordsSeen}
const userResults = new Map(); // username -> [{exerciseId, correct, timestamp}]
const exerciseStore = new Map(); // exerciseId -> {palavra, type}

function getOrCreateUser(username) {
  if (!userProgress.has(username)) {
    userProgress.set(username, {
      nivelAtual: 'A1',
      totalAcertos: 0,
      totalErros: 0,
      ultimaAtividade: new Date(),
      wordsSeen: new Map() // word -> {attempts, correct}
    });
    userResults.set(username, []);
  }
  return userProgress.get(username);
}

function storeExercises(exercises) {
  exercises.forEach(exercise => {
    exerciseStore.set(exercise.id, {
      palavra: exercise.palavra,
      type: exercise.type
    });
  });
}

function updateProgress(username, answers) {
  const user = getOrCreateUser(username);
  let acertos = 0;
  answers.forEach(answer => {
    const correct = answer.correct;
    if (correct) acertos++;
    user.totalAcertos += correct ? 1 : 0;
    user.totalErros += correct ? 0 : 1;
    user.ultimaAtividade = new Date();

    // Update wordsSeen
    const exerciseData = exerciseStore.get(answer.exerciseId);
    if (exerciseData) {
      const word = exerciseData.palavra;
      if (!user.wordsSeen.has(word)) {
        user.wordsSeen.set(word, { attempts: 0, correct: 0 });
      }
      const wordStats = user.wordsSeen.get(word);
      wordStats.attempts++;
      if (correct) wordStats.correct++;
    }

    // Store result
    userResults.get(username).push({
      exerciseId: answer.exerciseId,
      correct,
      timestamp: new Date()
    });
  });

  // Calculate accuracy for level progression
  const total = answers.length;
  const accuracyDecimal = total > 0 ? acertos / total : 0;
  const accuracy = Math.round(accuracyDecimal * 100); // Convert to percentage
  const newLevel = calculateLevelProgression(user.nivelAtual, accuracyDecimal);
  if (newLevel !== user.nivelAtual) {
    user.nivelAtual = newLevel;
  }

  return { accuracy, newLevel: user.nivelAtual };
}

function calculateLevelProgression(currentLevel, accuracy) {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = levels.indexOf(currentLevel);
  if (accuracy >= 0.8) {
    // Level up
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  } else if (accuracy <= 0.5) {
    // Level down, min A1
    return levels[Math.max(currentIndex - 1, 0)];
  } else {
    // Stay
    return currentLevel;
  }
}

function getUserLevel(username) {
  const user = getOrCreateUser(username);
  return user.nivelAtual;
}

function UserProgressService() {
  return {
    getOrCreateUser,
    storeExercises,
    updateProgress,
    getUserLevel,
    calculateLevelProgression
  };
}

export default UserProgressService();