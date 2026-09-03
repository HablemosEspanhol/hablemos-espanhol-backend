import { Body, Controller, Header, Post, Response, Route, Security, SuccessResponse, Tags, Request } from "tsoa";
import { Request as ExpressRequest } from 'express';
import Logger from "../../shared/Logger.js";
import { LessonsService } from "../lessons/lessons.service.js";
import DI from "../../shared/di.js";
import { SubmitLessonPayload } from "./exercises.types.js";
import { CompleteLessonResponse } from "../lessons/lessons.types.js";

@Tags("Exercises V2")
@Route("api/exercises/v2/submit")
@Security("jwt")
export class ExercisesV2SubmitController extends Controller {
  constructor(
    private readonly lessonsService: LessonsService = DI.LessonsService
  ) {
    super();
  }

  /**
   * Envia a submissão de conclusão de uma lição.
   * 
   * @param username Usuário vindo do cabeçalho 'x-auth-username'
   * @param requestBody Objeto contendo o número da lição 'lessonNumber'
   */
  @Post()
  @SuccessResponse("200", "Lição concluída com sucesso")
  @Response("400", "lessonNumber é obrigatório e deve ser um número")
  @Response("500", "Erro interno do servidor")
  public async submitLesson(
    @Body() requestBody: SubmitLessonPayload,
    @Request() request: ExpressRequest
  ): Promise<CompleteLessonResponse> {
    const { username } = request.user!;
    const { lessonNumber } = requestBody;

    if (typeof lessonNumber !== "number") {
      this.setStatus(400);
      throw new Error("LessonNumber is required and must be a number");
    }

    try {
      return await this.lessonsService.completeLesson(username, lessonNumber);
    } catch (error: any) {
      Logger.error("Error submitting lesson progress:", error);
      const status = error.status || 500;
      const message = error.error || "Internal server error";
      this.setStatus(status);
      throw new Error(message);
    }
  }
}