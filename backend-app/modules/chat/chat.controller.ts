import { ChatService } from './chat.service.js';
import Logger from '../../shared/Logger.js';
import { UserProgressService } from '../user/user-progress.service.js';
import { Body, Controller, Post, Route, SuccessResponse, Tags, Response, Security } from 'tsoa';
import DI from '../../shared/di.js';
import { ChatPayload, ChatServiceResponse } from './chat.types.js';

@Tags("Chat")
@Route("api/chat")
export class ChatController extends Controller {

  // Recebe as dependências da aplicação através do construtor
  constructor(
    private readonly chatService: ChatService = DI.ChatService,
    private readonly userProgressService: UserProgressService = DI.UserProgressService
  ) {
    super();
  }

 
  @Post()
  @SuccessResponse("200", "Mensagem processada com sucesso")
  @Response("400", "Username e message são obrigatórios")
  @Response("500", "Erro interno do servidor")
  public async handleChatRequest(
    @Body() requestBody: ChatPayload
  ): Promise<ChatServiceResponse> {
    const { username, message } = requestBody;

    if (!username || !message) {
      this.setStatus(400);
      throw new Error('Username and message are required');
    }

    try {
      await this.userProgressService.getOrCreateUser(username);
      const context = await this.userProgressService.getUserChatContext(username);
      
      const chatResponse = await this.chatService.generateResponse(message, {
        username,
        ...context
      });

      return chatResponse;
    } catch (error: any) {
      Logger.error('Error in chat endpoint:', error);
      this.setStatus(500);
      throw new Error('Internal server error');
    }
  }
}