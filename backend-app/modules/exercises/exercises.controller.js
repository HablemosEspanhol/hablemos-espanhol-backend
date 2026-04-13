import express from 'express';
import Logger from '../../shared/Logger.js';
import ExercisesService from './exercises.service.js';

const router = express.Router();

// GET /api/exercises?username={username}
router.get('/', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    res.json(await ExercisesService.getExercisesByUsername(username));
  } catch (error) {
    Logger.error('Error generating exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/exercises/submit
router.post('/submit', async (req, res) => {
  try {
    console.log(req.body);
    const { username, answers } = req.body;
    var response = await ExercisesService.validateExercise(username, answers);
    res.json(response);
  } catch (error) {
    Logger.error('Error submitting exercises:', error);
    var status = error.status || 500;
    var message = error.error || 'Internal server error';
    res.status(status).json({ error: message });
  }
});

// POST /api/exercises/check
router.post('/check', async (req, res) => {
  try {
    const { username, answer } = req.body;
    
    const result = await ExercisesService.checkOneExercise(username, answer);

    res.json(result);
  } catch (error) {
    Logger.error('Error checking exercise:', error);
    var status = error.status || 500;
    var message = error.error || 'Internal server error';
    res.status(status).json({ error: message });
  }
});

export default router;
