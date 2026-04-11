import pool from '../../config/database.js';

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

  const validExercises = exercises.filter(exercise =>
    exercise &&
    typeof exercise.correctAnswer === 'string' &&
    exercise.correctAnswer.trim().length > 0
  );

  if (validExercises.length === 0) {
    return;
  }

  const user = await getOrCreateUser(username);
  const values = validExercises.map(exercise => [
    exercise.instanceId,
    exercise.id,
    user.id,
    exercise.palavra,
    exercise.type,
    exercise.correctAnswer
  ]);

  await pool.query(
    'INSERT INTO exercise_instances (id, exercise_id, user_id, phrase, exercise_type, correct_answer) VALUES ?',
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

function normalizeAnswer(value) {
  return String(value ?? '').trim();
}

function resolveSubmittedAnswer(answer) {
  if (typeof answer?.answer !== 'undefined') {
    return answer.answer;
  }

  if (typeof answer?.userAnswer !== 'undefined') {
    return answer.userAnswer;
  }

  return '';
}

async function getExerciseMapForUser(connection, userId, exerciseIds) {
  const [exerciseRows] = await connection.query(
    `SELECT ei.id AS instance_id, ei.exercise_id, ei.correct_answer, ei.phrase
       FROM exercise_instances ei
       INNER JOIN (
         SELECT exercise_id, MAX(created_at) AS latest_created_at
         FROM exercise_instances
         WHERE exercise_id IN (?) AND user_id = ?
         GROUP BY exercise_id
       ) latest
         ON latest.exercise_id = ei.exercise_id
        AND latest.latest_created_at = ei.created_at
      WHERE ei.exercise_id IN (?) AND ei.user_id = ?`,
    [exerciseIds, userId, exerciseIds, userId]
  );

  return new Map(exerciseRows.map(row => [row.exercise_id, row]));
}

async function checkExerciseAnswer(username, answer) {
  const user = await getOrCreateUser(username);

  if (!answer?.exerciseId) {
    throw new Error('Nenhum exercicio valido informado.');
  }

  const connection = await pool.getConnection();
  try {
    const exerciseMap = await getExerciseMapForUser(connection, user.id, [answer.exerciseId]);
    const exerciseData = exerciseMap.get(answer.exerciseId);

    if (!exerciseData) {
      return null;
    }

    const userAnswer = resolveSubmittedAnswer(answer);
    const correctAnswer = normalizeAnswer(exerciseData.correct_answer);
    const isCorrect = normalizeAnswer(userAnswer) === correctAnswer;

    return {
      exerciseId: answer.exerciseId,
      correctAnswer,
      message: isCorrect ? 'Resposta correta.' : 'Resposta incorreta.'
    };
  } finally {
    connection.release();
  }
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
    const exerciseMap = await getExerciseMapForUser(connection, user.id, exerciseIds);

    let acertos = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    const resultValues = answers.map(answer => {
      const exerciseData = exerciseMap.get(answer.exerciseId);
      const userAnswer = resolveSubmittedAnswer(answer);

      let correct = false;
      if (exerciseData && typeof userAnswer !== 'undefined') {
        correct = normalizeAnswer(userAnswer) === normalizeAnswer(exerciseData.correct_answer);
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
        exerciseData?.instance_id ?? null,
        userAnswer !== undefined ? String(userAnswer) : null,
        correct ? 1 : 0
      ];
    });

    const validResultValues = resultValues.filter(resultValue => resultValue[1]);

    if (validResultValues.length > 0) {
      await connection.query(
        'INSERT INTO exercise_results (user_id, exercise_instance_id, user_answer, correct) VALUES ?',
        [validResultValues]
      );
    }

    for (const answer of answers) {
        const exerciseData = exerciseMap.get(answer.exerciseId);
        if (!exerciseData) continue;

        const phrase = exerciseData.phrase;
        const correct = resultValues.find(rv => rv[1] === exerciseData.instance_id)?.[3] === 1;

        const now = new Date();

        await connection.execute(
          `INSERT INTO user_phrase_progress 
            (user_id, phrase, wrong_count, correct_count, last_seen_at)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            wrong_count = wrong_count + IF(?, 1, 0),
            correct_count = correct_count + IF(?, 1, 0),
            last_seen_at = ?`,
          [
            user.id,
            phrase,
            correct ? 0 : 1,
            correct ? 1 : 0,
            now,            // INSERT
            !correct,
            correct,
            now             // UPDATE
          ]
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
    'SELECT ei.phrase FROM exercise_results er JOIN exercise_instances ei ON er.exercise_instance_id = ei.id WHERE er.user_id = ? AND er.correct = 0 GROUP BY ei.phrase ORDER BY MAX(er.submitted_at) DESC LIMIT 5',
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

async function getPhraseProgress(username, amount) {
  var query = `SELECT phrase, wrong_count, correct_count, last_seen_at
                  FROM hablemos_espanhol.user_phrase_progress UPP
                  INNER JOIN hablemos_espanhol.users u ON (UPP.user_id = u.id)
                  where u.username = ?`;

  const [rows] = await pool.query(query, [username]);
  return rows.map(x=> {
    const diffMs = new Date() - new Date(x.last_seen_at);
    const seg_sem_ver = Math.floor(diffMs / 1000);
    const wrongCount = Number(x.wrong_count);
    const correctCount = Number(x.correct_count);
    const hasOnlyCorrectAnswers = wrongCount === 0 && correctCount > 0;
    const isInRecentCooldown = hasOnlyCorrectAnswers && seg_sem_ver < 300;
    const score = isInRecentCooldown ? -1 : (wrongCount * 2) + seg_sem_ver;

    return {
      ...x,
      score,
      seg_sem_ver,
      isInRecentCooldown
    }
  }).filter(x => x.score >= 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, amount);
}

export default {
  getOrCreateUser,
  getUserLevel,
  storeExercises,
  checkExerciseAnswer,
  updateProgress,
  getUserChatContext,
  calculateLevelProgression,
  getPhraseProgress
};
