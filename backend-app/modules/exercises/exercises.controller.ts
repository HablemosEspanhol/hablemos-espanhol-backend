import Logger from '../../shared/Logger.js';
import { CheckExercisePayload, PublicExercise, SubmitExercisesPayload, SubmitValidationResult } from './exercises.types.js';
import { SubmitAnswerInput, CheckAnswerResult } from '../user/user-progress.types.js';
import { ExercisesService } from './exercises.service.js';
import { Controller, Get, Post, Body, Header, Response, Route, Security, SuccessResponse, Tags, Request } from "tsoa";
import { Request as ExpressRequest } from 'express';
import DI from '../../shared/di.js';

@Tags("Exercises")
@Route("api/exercises")
@Security("jwt")
export class ExercisesController extends Controller {

  constructor(private readonly exercisesService: ExercisesService = DI.ExercisesService) {
    super();
    if (exercisesService == null) throw new Error("[ExercisesController] exercisesService is null");
  }

  /**
   * Obtém a lista de exercícios para o usuário informado no cabeçalho.
   * 
   */
  @Get()
  @SuccessResponse("200", "Exercícios obtidos com sucesso")
  @Response("500", "Erro interno do servidor")
  public async getExercises(
     @Request() request: ExpressRequest
  ): Promise<PublicExercise[]> {
    try {
      const { username } = request.user!;
      return await this.exercisesService.getExercisesByUsername(username);
    } catch (error: any) {
      Logger.error('Error generating exercises:', error);
      this.setStatus(500);
      throw new Error('Internal server error');
    }
  }

  /**
   * Envia as respostas de um conjunto de exercícios para validação.
   * 
   * @param requestBody Objeto contendo o array de respostas 'answers'
   */
  @Post("submit")
  @SuccessResponse("200", "Exercícios validados com sucesso")
  @Response("400", "Dados de entrada inválidos")
  @Response("500", "Erro interno do servidor")
  public async submitExercises(
    @Request() request: ExpressRequest,
    @Body() requestBody: SubmitExercisesPayload
  ): Promise<SubmitValidationResult> {
    try {
      const { username } = request.user!;
      return await this.exercisesService.validateExercise(
        username,
        requestBody.answers
      );
    } catch (error: any) {
      Logger.error('Error submitting exercises:', error);
      const status = error.status || 500;
      const message = error.error || 'Internal server error';
      this.setStatus(status);
      throw new Error(message);
    }
  }

  /**
   * Checa uma única resposta de exercício em tempo real.
   * 
   * @param requestBody Objeto contendo a resposta 'answer' a ser checada
   */
  @Post("check")
  @SuccessResponse("200", "Exercício checado com sucesso")
  @Response("400", "Dados de entrada inválidos")
  @Response("500", "Erro interno do servidor")
  public async checkExercise(
    @Request() request: ExpressRequest,
    @Body() requestBody: CheckExercisePayload
  ): Promise<CheckAnswerResult> {
    try {
      const { username } = request.user!;
      return await this.exercisesService.checkOneExercise(
        username,
        requestBody.answer
      );
    } catch (error: any) {
      Logger.error('Error checking exercise:', error);
      const status = error.status || 500;
      const message = error.error || 'Internal server error';
      this.setStatus(status);
      throw new Error(message);
    }
  }
}