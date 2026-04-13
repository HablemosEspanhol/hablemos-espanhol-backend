import express from 'express';
import Logger from '../../shared/Logger.js';
import questionsRepository from '../exercises/questions.repository.js';

const router = express.Router();

// GET /api/phrases?level={level}&page={page}&limit={limit}
router.get('/', (req, res) => {
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

    const phrases = questionsRepository.getAllPhrasesForLevel(level);
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

export default router;
