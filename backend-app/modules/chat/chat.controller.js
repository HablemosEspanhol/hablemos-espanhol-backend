import express from 'express';
import ChatService from './chat.service.js';
import Logger from '../../shared/Logger.js';
import UserProgressRepository from '../exercises/user-progress.repository.js';

const router = express.Router();

// POST /api/chat - Chat com tutor de espanhol
router.post('/', async (req, res) => {
  try {
    const { username, message } = req.body;

    if (!username || !message) {
      return res.status(400).json({ error: 'Username and message are required' });
    }

    await UserProgressRepository.getOrCreateUser(username);
    const context = await UserProgressRepository.getUserChatContext(username);
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
