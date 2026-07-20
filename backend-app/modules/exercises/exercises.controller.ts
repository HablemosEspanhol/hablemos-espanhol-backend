import { Router, Request, Response, RequestHandler } from 'express';
import Logger from '../../shared/Logger.js';
import { PublicExercise, SubmitValidationResult } from '../../domain/models/exercises.types.js';
import { SubmitAnswerInput, CheckAnswerResult } from '../../domain/models/user-progress.types.js';
import { ExercisesService } from './exercises.service.js';
import { BaseController } from '../base.controller.js';

export class ExercisesController extends BaseController{

  // Recebe o serviço puramente desacoplado por inversão de dependência
  constructor(private readonly exercisesService: ExercisesService) {
    super();
    if(exercisesService == null) throw new Error("[ExercisesController] exercisesService is null");
  }

  /**
   * Inicializa o mapeamento de endpoints das rotas de exercícios
   */
  protected initializeRoutes(router: Router): void {
    router.get('/', this.getExercises.bind(this));
    router.post('/submit', this.submitExercises.bind(this));
    router.post('/check', this.checkExercise.bind(this));
  }

  /**
   * GET /api/exercises?username={username}
   */
  private async getExercises(req: Request, res: Response): Promise<void> {
    try {
      const username = req.query.username as string | undefined;
      
      if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return;
      }

      const exercises: PublicExercise[] = await this.exercisesService.getExercisesByUsername(username);
      res.json(exercises);
    } catch (error: any) {
      Logger.error('Error generating exercises:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * POST /api/exercises/submit
   */
  private async submitExercises(req: Request, res: Response): Promise<void> {
    try {
      Logger.info(req.body);
      const { username, answers } = req.body as { username?: string; answers?: SubmitAnswerInput[] };

      const response: SubmitValidationResult = await this.exercisesService.validateExercise(
        username!,
        answers!
      );
      
      res.json(response);
    } catch (error: any) {
      Logger.error('Error submitting exercises:', error);
      const status = error.status || 500;
      const message = error.error || 'Internal server error';
      res.status(status).json({ error: message });
    }
  };

  /**
   * POST /api/exercises/check
   */
  private async checkExercise(req: Request, res: Response): Promise<void> {
    try {
      const { username, answer } = req.body as { username?: string; answer?: SubmitAnswerInput };

      const result: CheckAnswerResult = await this.exercisesService.checkOneExercise(
        username!, 
        answer!
      );

      res.json(result);
    } catch (error: any) {
      Logger.error('Error checking exercise:', error);
      const status = error.status || 500;
      const message = error.error || 'Internal server error';
      res.status(status).json({ error: message });
    }
  };
}