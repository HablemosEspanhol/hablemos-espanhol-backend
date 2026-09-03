import { Controller, Get, Header, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import Logger from "../../shared/Logger.js";
import { LessonsService } from "./lessons.service.js";
import DI from "../../shared/di.js";

// Importe ou defina a interface do retorno de progress summary se existir
export interface ProgressSummary {
  [key: string]: any;
}

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
   * 
   * @param username Nome do usuário vindo do header x-auth-username
   */
  @Get()
  @SuccessResponse("200", "Resumo do progresso obtido com sucesso")
  @Response("400", "Username ausente")
  @Response("500", "Erro interno do servidor")
  public async getProgress(
    @Header("x-auth-username") username: string
  ): Promise<ProgressSummary> {
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