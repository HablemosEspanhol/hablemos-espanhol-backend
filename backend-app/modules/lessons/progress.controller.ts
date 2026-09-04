import { Controller, Get, Header, Response, Route, Security, SuccessResponse, Tags, Request } from "tsoa";
import { Request as ExpressRequest } from 'express';
import Logger from "../../shared/Logger.js";
import { LessonsService } from "./lessons.service.js";
import DI from "../../shared/di.js";
import { ProgressSummary } from "./lessons.types.js";

// Importe ou defina a interface do retorno de progress summary se existir
@Tags("Progress")
@Route("api/progress")
@Security("jwt")
export class ProgressController extends Controller {
  constructor(
    private readonly lessonsService: LessonsService = DI.LessonsService
  ) {
    super();
  }

  /**
   * Obtém o resumo do progresso do usuário informado no cabeçalho.
   */
  @Get()
  @SuccessResponse("200", "Resumo do progresso obtido com sucesso")
  @Response("400", "Username ausente")
  @Response("500", "Erro interno do servidor")
  public async getProgress(
    @Request() request: ExpressRequest
  ): Promise<ProgressSummary> {
    const { username } = request.user!;
    if (!username) {
      this.setStatus(400);
      throw new Error("Username is required");
    }

    try {
      return await this.lessonsService.getProgressSummary(username);
    } catch (error: any) {
      Logger.error("Error getting progress:", error);
      this.setStatus(500);
      throw new Error("Internal server error");
    }
  }
}