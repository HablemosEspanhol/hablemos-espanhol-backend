import { Router, Request, Response, RequestHandler } from 'express';
import { ChatService } from './chat.service.js';
import Logger from '../../shared/Logger.js';
import { IUserProgressRepository } from '../user/iuser-progress.repository.js';
import { BaseController } from '../../shared/base.controller.js';

export class ChatController extends BaseController {

  // Recebe as dependências da aplicação através do construtor
  constructor(
    private readonly chatService: ChatService,
    private readonly userProgressRepository: IUserProgressRepository
  ) {
    super();
  }

  /**
   * Mapeia os endpoints do Express para os métodos da classe.
   */
  protected initializeRoutes(router: Router): void {
    // Usamos uma arrow function ou bind para não perder o escopo do "this" da classe
    router.post('/', this.handleChatRequest.bind(this));
  }

  /**
   * Handler principal da rota de POST /api/chat
   */
  private async handleChatRequest(req: Request, res: Response): Promise<void> {
    try {
      const { username, message } = req.body as { username?: string; message?: string };

      if (!username || !message) {
        res.status(400).json({ error: 'Username and message are required' });
        return;
      }

      // Interage estritamente com as dependências injetadas
      await this.userProgressRepository.getOrCreateUser(username);
      const context = await this.userProgressRepository.getUserChatContext(username);
      
      const chatResponse = await this.chatService.generateResponse(message, {
        username,
        ...context
      });

      res.json(chatResponse);
    } catch (error: any) {
      Logger.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}