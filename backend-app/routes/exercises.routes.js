import express from 'express';
import QuestionsCacheLoader from '../core/QuestionsCacheLoader.js';
import ExerciseService from '../core/services/ExerciseService.js';
import UserProgressService from '../core/services/UserProgressService.js';
import ChatService from '../core/services/ChatService.js';
import Logger from '../core/Logger.js';

const router = express.Router();

// GET /api/exercises?username={username}
router.get('/exercises', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const userLevel = await UserProgressService.getUserLevel(username);
    const phrasesToReview = await UserProgressService.getPhraseProgress(username, 5);
    console.log('phrasesToReview',phrasesToReview);
    const phrases = QuestionsCacheLoader.getPhrasesForExercises(userLevel, 10, phrasesToReview);
    if (phrases.length < 10) {
      const fallbackPhrases = QuestionsCacheLoader.getPhrasesForExercises('A1', 10);
      phrases.push(...fallbackPhrases.slice(0, 10 - phrases.length));
    }

    const exercises = ExerciseService.generateExercises(phrases);
    await UserProgressService.storeExercises(username, exercises);

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
router.post('/exercises/submit', async (req, res) => {
  try {
    const { username, answers } = req.body;
    const invalidAnswer = Array.isArray(answers)
      ? answers.some(answer => !answer || !answer.exerciseId || (typeof answer.answer === 'undefined' && typeof answer.userAnswer === 'undefined' && typeof answer.correct === 'undefined'))
      : true;

    if (!username || !answers || !Array.isArray(answers) || invalidAnswer) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await UserProgressService.updateProgress(username, answers);

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

// POST /api/exercises/check
router.post('/exercises/check', async (req, res) => {
  try {
    const { username, answer } = req.body;

    const hasUserAnswer = answer && (
      typeof answer.answer !== 'undefined' ||
      typeof answer.userAnswer !== 'undefined'
    );

    if (!username || !answer?.exerciseId || !hasUserAnswer) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await UserProgressService.checkExerciseAnswer(username, answer);

    if (!result) {
      return res.status(404).json({ error: 'Exercise not found for user' });
    }

    res.json(result);
  } catch (error) {
    Logger.error('Error checking exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat - Chat com tutor de espanhol
router.post('/chat', async (req, res) => {
  try {
    const { username, message } = req.body;

    if (!username || !message) {
      return res.status(400).json({ error: 'Username and message are required' });
    }

    await UserProgressService.getOrCreateUser(username);
    const context = await UserProgressService.getUserChatContext(username);
    const chatResponse = await ChatService.generateResponse(message, {
      username,
      ...context
    });

    res.json(chatResponse);
  } catch (error) {
    Logger.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
