import { Router, Request, Response, RequestHandler } from 'express';
import Logger from '../../shared/Logger.js';
import { LevelPhrase, PaginatedPhrasesResponse } from '../exercises/questions.types.js';
import { QuestionsService } from '../exercises/question.service.js';
import { BaseController } from '../../shared/base.controller.js';

export class PhrasesController extends BaseController{

  // Recebe a interface do serviço puramente desacoplada por injeção de dependência
  constructor(private readonly questionsService: QuestionsService) {
    super();
  }

  /**
   * Inicializa o mapeamento de endpoints para o recurso de frases
   */
  protected initializeRoutes(router: Router): void {
    router.get('/', this.getPhrasesByLevel.bind(this));
  }

  /**
   * GET /api/phrases?level={level}&page={page}&limit={limit}
   */
  private async getPhrasesByLevel(req: Request, res: Response): Promise<void> {
    try {
      const { level, page = '1', limit = '20' } = req.query;
      
      if (!level || typeof level !== 'string') {
        res.status(400).json({ error: 'Level parameter is required and must be a string' });
        return;
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      
      if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1 || limitNum > 100) {
        res.status(400).json({ error: 'Invalid page or limit parameters' });
        return;
      }

      // Interage com o serviço injetado
      const phrases = this.questionsService.getAllPhrasesForLevel(level);

      const total = phrases.length;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedPhrases = phrases.slice(startIndex, endIndex);

      const response: PaginatedPhrasesResponse = {
        level,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        data: paginatedPhrases
      };

      res.json(response);
    } catch (error: any) {
      Logger.error('Error fetching phrases:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}