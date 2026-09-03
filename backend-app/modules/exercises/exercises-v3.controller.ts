import { Controller, Get, Header, Response, Route, Security, SuccessResponse, Tags, Request } from "tsoa";
import { Request as ExpressRequest } from 'express';
import Logger from "../../shared/Logger.js";
import { ExercisesService } from "./exercises.service.js";
import { PublicExercise } from "./exercises.types.js";
import DI from "../../shared/di.js";

@Tags("Exercises V3")
@Route("api/exercises/v3")
@Security("jwt")
export class ExercisesV3Controller extends Controller {
  constructor(
    private readonly exercisesService: ExercisesService = DI.ExercisesService
  ) {
    super();
  }

  /**
   * Obtém os exercícios no formato V3 para o usuário informado no cabeçalho.
   * 
   * @param username Nome do usuário vindo do header x-auth-username
   */
  @Get()
  @SuccessResponse("200", "Exercícios V3 obtidos com sucesso")
  @Response("500", "Erro interno do servidor")
  public async getExercisesV3(
    @Request() request: ExpressRequest
  ): Promise<PublicExercise[]> {

    try {
      const { username } = request.user!;
      return await this.exercisesService.getExercisesV3(username);
    } catch (error: any) {
      Logger.error("Error generating exercises v3:", error);
      this.setStatus(500);
      throw new Error("Internal server error");
    }
  }
}