import { Controller, Get, Header, Response, Route, Security, SuccessResponse, Tags, Request } from "tsoa";
import { Request as ExpressRequest } from 'express';
import { ExercisesService } from "./exercises.service.js";
import Logger from "../../shared/Logger.js";
import { PublicExercise } from "./exercises.types.js";
import DI from "../../shared/di.js";

@Tags("Exercises V2")
@Route("api/exercises/v2")
@Security("jwt")
export class ExercisesV2Controller extends Controller {

  constructor(
    private readonly exercisesService: ExercisesService = DI.ExercisesService
  ) {
    super();
    if (this.exercisesService == null) {
      throw new Error("[ExercisesV2Controller] exercisesService is null");
    }
  }

  /**
   * Obtém exercícios usando geração por IA para o usuário informado.
   * 
   * @param username Nome do usuário vindo do header x-auth-username
   */
  @Get()
  @SuccessResponse("200", "Exercícios V2 gerados com sucesso")
  @Response("400", "Username ausente")
  @Response("500", "Erro interno do servidor")
  public async getExercisesV2(
    @Request() request: ExpressRequest
  ): Promise<PublicExercise[]> {
    const { username } = request.user!;
    
    if (!username) {
      this.setStatus(400);
      throw new Error('Username is required');
    }

    try {
      return await this.exercisesService.getExercisesByUsernameUsingAI(username);
    } catch (error: any) {
      Logger.error('Error generating exercises V2:', error);
      this.setStatus(500);
      throw new Error('Internal server error');
    }
  }
}