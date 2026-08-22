import { Request, Response, Router } from "express";
import { BaseController } from "../../shared/base.controller.js";
import Logger from "../../shared/Logger.js";
import { LessonsService } from "./lessons.service.js";

export class ProgressController extends BaseController {
  constructor(private readonly lessonsService: LessonsService) {
    super();
  }

  protected initializeRoutes(router: Router): void {
    router.get("/", this.getProgress.bind(this));
  }

  private async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const username = req.headers['x-auth-username'] as string;
      if (!username) {
        res.status(400).json({ error: "Username is required" });
        return;
      }

      const progress = await this.lessonsService.getProgressSummary(username);
      res.json(progress);
    } catch (error: any) {
      Logger.error("Error getting progress:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
