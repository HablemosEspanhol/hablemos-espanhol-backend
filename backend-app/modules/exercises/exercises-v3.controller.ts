import { Controller, Get, Response, Route, Security, SuccessResponse, Tags, Request, Post, Body } from "tsoa";
import { Request as ExpressRequest } from 'express';
import Logger from "../../shared/Logger.js";
import { ExercisesService } from "./exercises.service.js";
import { PublicExercise, SubmitLessonPayload, SubmitValidationResult } from "./exercises.types.js";
import DI from "../../shared/di.js";
import { LessonsService } from "../lessons/lessons.service.js";

@Tags("Exercises V3")
@Route("api/exercises/v3")
@Security("jwt")
export class ExercisesV3Controller extends Controller {
  constructor(
    private readonly exercisesService: ExercisesService = DI.ExercisesService,
     private readonly lessonsService: LessonsService = DI.LessonsService
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

  /**
     * Envia a submissão de conclusão de uma lição.
     * 
     * @param username Usuário vindo do cabeçalho 'x-auth-username'
     * @param requestBody Objeto contendo o número da lição 'lessonNumber'
     */
    @Post("/submit")
    @SuccessResponse("200", "Lição concluída com sucesso")
    @Response("400", "lessonNumber é obrigatório e deve ser um número")
    @Response("500", "Erro interno do servidor")
    public async submitLesson(
      @Body() requestBody: SubmitLessonPayload,
      @Request() request: ExpressRequest
    ): Promise<SubmitValidationResult> {
      const { username } = request.user!;
      const { lessonNumber } = requestBody;
  
      if (typeof lessonNumber !== "number") {
        this.setStatus(400);
        throw new Error("LessonNumber is required and must be a number");
      }
  
      try {
        var checkExercise = await this.exercisesService.validateExercise(
          username,
          requestBody.answers
        );

        if(checkExercise.lessonCompleted) {
          await this.lessonsService.completeLesson(username, lessonNumber);
        }

        return checkExercise;
      } catch (error: any) {
        Logger.error("Error submitting lesson progress:", error);
        const status = error.status || 500;
        const message = error.error || "Internal server error";
        this.setStatus(status);
        throw new Error(message);
      }
    }
}