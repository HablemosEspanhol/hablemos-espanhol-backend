import pool from '../config/database.js';

const DEFAULT_LEVEL = 'A1';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function mapProgressRow(row) {
  return {
    id: row.id,
    username: row.username,
    nivelAtual: row.current_level || DEFAULT_LEVEL,
    totalAcertos: row.total_correct || 0,
    totalErros: row.total_incorrect || 0,
    ultimaAtividade: row.last_activity ? new Date(row.last_activity) : new Date()
  };
}

async function getUserProgressRow(username) {
  const [rows] = await pool.query(
    'SELECT u.id, u.username, up.current_level, up.total_correct, up.total_incorrect, up.last_activity FROM users u JOIN user_progress up ON u.id = up.user_id WHERE u.username = ?',
    [username]
  );
  return rows[0];
}

async function createUserWithProgress(username) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [userResult] = await connection.query(
      'INSERT INTO users (username) VALUES (?)',
      [username]
    );
    const userId = userResult.insertId;

    await connection.query(
      'INSERT INTO user_progress (user_id, current_level, total_correct, total_incorrect, last_activity) VALUES (?, ?, 0, 0, NOW())',
      [userId, DEFAULT_LEVEL]
    );

    await connection.commit();
    return {
      id: userId,
      username,
      current_level: DEFAULT_LEVEL,
      total_correct: 0,
      total_incorrect: 0,
      last_activity: new Date()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrCreateUser(username) {
  const row = await getUserProgressRow(username);
  if (row) {
    return mapProgressRow(row);
  }
  const created = await createUserWithProgress(username);
  return mapProgressRow(created);
}

async function getUserLevel(username) {
  const row = await getUserProgressRow(username);
  return row ? row.current_level : DEFAULT_LEVEL;
}

async function storeExercises(username, exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return;
  }

  const user = await getOrCreateUser(username);
  const values = exercises.map(exercise => [
    exercise.id,
    user.id,
    exercise.palavra,
    exercise.type,
    exercise.correctAnswer
  ]);

  await pool.query(
    'INSERT INTO exercise_instances (id, user_id, phrase, exercise_type, correct_answer) VALUES ?',
    [values]
  );
}

function calculateLevelProgression(currentLevel, accuracy) {
  const currentIndex = LEVELS.indexOf(currentLevel);
  if (accuracy >= 0.8) {
    return LEVELS[Math.min(currentIndex + 1, LEVELS.length - 1)];
  }
  if (accuracy <= 0.5) {
    return LEVELS[Math.max(currentIndex - 1, 0)];
  }
  return currentLevel;
}

async function updateProgress(username, answers) {
  const user = await getOrCreateUser(username);
  if (!Array.isArray(answers) || answers.length === 0) {
    return { accuracy: 0, newLevel: user.nivelAtual };
  }

  const exerciseIds = answers.map(answer => answer.exerciseId).filter(Boolean);
  if (exerciseIds.length === 0) {
    throw new Error('Nenhum exercício válido informado.');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [exerciseRows] = await connection.query(
      'SELECT id, correct_answer, phrase FROM exercise_instances WHERE id IN (?) AND user_id = ?',
      [exerciseIds, user.id]
    );
    const exerciseMap = new Map(exerciseRows.map(row => [row.id, row]));

    let acertos = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    const resultValues = answers.map(answer => {
      const exerciseData = exerciseMap.get(answer.exerciseId);
      let userAnswer = typeof answer.answer !== 'undefined'
        ? answer.answer
        : typeof answer.userAnswer !== 'undefined'
          ? answer.userAnswer
          : '';

      let correct = false;
      if (exerciseData && typeof userAnswer !== 'undefined') {
        correct = String(userAnswer).trim() === String(exerciseData.correct_answer).trim();
      } else if (typeof answer.correct === 'boolean') {
        correct = answer.correct;
      }

      if (correct) {
        acertos += 1;
        totalCorrect += 1;
      } else {
        totalIncorrect += 1;
      }

      return [
        user.id,
        answer.exerciseId,
        userAnswer !== undefined ? String(userAnswer) : null,
        correct ? 1 : 0
      ];
    });

    if (resultValues.length > 0) {
      await connection.query(
        'INSERT INTO exercise_results (user_id, exercise_instance_id, user_answer, correct) VALUES ?',
        [resultValues]
      );
    }

    const accuracyDecimal = answers.length > 0 ? acertos / answers.length : 0;
    const newLevel = calculateLevelProgression(user.nivelAtual, accuracyDecimal);
    const updatedCorrect = user.totalAcertos + totalCorrect;
    const updatedIncorrect = user.totalErros + totalIncorrect;

    await connection.query(
      'UPDATE user_progress SET current_level = ?, total_correct = ?, total_incorrect = ?, last_activity = ? WHERE user_id = ?',
      [newLevel, updatedCorrect, updatedIncorrect, new Date(), user.id]
    );

    await connection.commit();
    return {
      accuracy: Math.round(accuracyDecimal * 100),
      newLevel
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getUserChatContext(username) {
  const user = await getOrCreateUser(username);

  const [incorrectRows] = await pool.query(
    'SELECT DISTINCT ei.phrase FROM exercise_results er JOIN exercise_instances ei ON er.exercise_instance_id = ei.id WHERE er.user_id = ? AND er.correct = 0 ORDER BY er.submitted_at DESC LIMIT 5',
    [user.id]
  );

  const [correctRows] = await pool.query(
    'SELECT ei.phrase FROM exercise_results er JOIN exercise_instances ei ON er.exercise_instance_id = ei.id WHERE er.user_id = ? AND er.correct = 1 GROUP BY ei.phrase ORDER BY COUNT(*) DESC LIMIT 5',
    [user.id]
  );

  return {
    userLevel: user.nivelAtual,
    recentWords: [...incorrectRows.map(row => row.phrase), ...correctRows.map(row => row.phrase)],
    totalAcertos: user.totalAcertos,
    totalErros: user.totalErros
  };
}

export default {
  getOrCreateUser,
  getUserLevel,
  storeExercises,
  updateProgress,
  getUserChatContext,
  calculateLevelProgression
};
