import express from 'express';
import UserProgressService from '../../shared/data/UserProgressRepository.js';
import ChatService from '../../shared/services/ChatService.js';
import Logger from '../../shared/Logger.js';

const router = express.Router();

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
