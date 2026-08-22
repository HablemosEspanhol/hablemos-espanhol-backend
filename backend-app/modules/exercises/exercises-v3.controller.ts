import { Request, Response, Router } from "express";
import { BaseController } from "../../shared/base.controller.js";
import Logger from "../../shared/Logger.js";
import { ExercisesService } from "./exercises.service.js";

export class ExercisesV3Controller extends BaseController {
  constructor(private readonly exercisesService: ExercisesService) {
    super();
  }

  protected initializeRoutes(router: Router): void {
    router.get("/", this.getExercisesV3.bind(this));
  }

  private async getExercisesV3(req: Request, res: Response): Promise<void> {
    try {
      const username = req.headers['x-auth-username'] as string;

      const exercises = await this.exercisesService.getExercisesV3(username);
      res.json(exercises);
    } catch (error: any) {
      Logger.error("Error generating exercises v3:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
