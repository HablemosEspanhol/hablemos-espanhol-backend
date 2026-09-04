import Logger from '../../shared/Logger.js';
import { PaginatedPhrasesResponse } from '../exercises/questions.types.js';
import { QuestionsService } from '../exercises/question.service.js';
import { Controller, Get, Query, Route, Response, SuccessResponse, Tags, Security } from 'tsoa';
import DI from '../../shared/di.js';

@Tags("Phrases")
@Route("api/phrases")
export class PhrasesController extends Controller {

  constructor(private readonly questionsService: QuestionsService = DI.QuestionsService) {
    super();
  }

  /**
   * Busca frases paginadas por nível de aprendizado.
   * 
   * @param level Nível das frases a ser consultado
   * @param page Número da página (padrão: 1)
   * @param limit Quantidade de itens por página (máximo: 100, padrão: 20)
   */
  @Get()
  @SuccessResponse("200", "Frases retornadas com sucesso")
  @Response("400", "Parâmetro level ausente ou paginação inválida")
  @Response("500", "Erro interno do servidor")
  public async getPhrasesByLevel(
    @Query() level: string,
    @Query() page: number = 1,
    @Query() limit: number = 20
  ): Promise<PaginatedPhrasesResponse> {
    try {
      if (!level || typeof level !== 'string') {
        this.setStatus(400);
        throw new Error('Level parameter is required and must be a string');
      }

      if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 100) {
        this.setStatus(400);
        throw new Error('Invalid page or limit parameters');
      }

      const phrases = this.questionsService.getAllPhrasesForLevel(level);

      const total = phrases.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPhrases = phrases.slice(startIndex, endIndex);

      return {
        level,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        data: paginatedPhrases
      };
    } catch (error: any) {
      Logger.error('Error fetching phrases:', error);
      
      // Preserva códigos 400 explicitamente definidos
      if (this.getStatus() === 400) {
        throw error;
      }

      this.setStatus(500);
      throw new Error('Internal server error');
    }
  }
}