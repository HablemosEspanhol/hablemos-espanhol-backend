import express from 'express';
import QuestionsCacheLoader from '../core/QuestionsCacheLoader.js';
import ExerciseService from '../services/ExerciseService.js';
import UserProgressService from '../services/UserProgressService.js';
import Logger from '../core/Logger.js';

const router = express.Router();

// GET /api/exercises?username={username}
router.get('/exercises', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const userLevel = UserProgressService.getUserLevel(username);
    const phrases = QuestionsCacheLoader.getPhrasesForExercises(userLevel, 10);
    if (phrases.length < 10) {
      // Fallback to A1 if insufficient
      const fallbackPhrases = QuestionsCacheLoader.getPhrasesForExercises('A1', 10);
      phrases.push(...fallbackPhrases.slice(0, 10 - phrases.length));
    }

    const exercises = ExerciseService.generateExercises(phrases);
    UserProgressService.storeExercises(exercises);

    const publicExercises = exercises.map(({ correctAnswer, ...exercise }) => exercise);
    res.json(publicExercises);
  } catch (error) {
    Logger.error('Error generating exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/phrases?level={level}&page={page}&limit={limit}
router.get('/phrases', (req, res) => {
  try {
    const { level, page = 1, limit = 20 } = req.query;
    
    if (!level) {
      return res.status(400).json({ error: 'Level parameter is required' });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid page or limit parameters' });
    }

    const phrases = QuestionsCacheLoader.getAllPhrasesForLevel(level);
    const total = phrases.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPhrases = phrases.slice(startIndex, endIndex);

    res.json({
      level,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: paginatedPhrases
    });
  } catch (error) {
    Logger.error('Error fetching phrases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/exercises/submit
router.post('/exercises/submit', (req, res) => {
  try {
    const { username, answers } = req.body;
    const invalidAnswer = Array.isArray(answers)
      ? answers.some(answer => !answer || !answer.exerciseId || (typeof answer.answer === 'undefined' && typeof answer.userAnswer === 'undefined' && typeof answer.correct === 'undefined'))
      : true;

    if (!username || !answers || !Array.isArray(answers) || invalidAnswer) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = UserProgressService.updateProgress(username, answers);
    
    // Create message based on accuracy and level
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
    
    res.json({
      accuracy: result.accuracy,
      newLevel: result.newLevel,
      message
    });
  } catch (error) {
    Logger.error('Error submitting exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;