import { Request, Response, Router } from "express";
import { BaseController } from "../../shared/base.controller.js";
import Logger from "../../shared/Logger.js";
import { LessonsService } from "../lessons/lessons.service.js";

export class ExercisesV2SubmitController extends BaseController {
  constructor(private readonly lessonsService: LessonsService) {
    super();
  }

  protected initializeRoutes(router: Router): void {
    router.post("/", this.submitLesson.bind(this));
  }

  private async submitLesson(req: Request, res: Response): Promise<void> {
    try {
      const username = req.headers['x-auth-username'] as string;
      const { lessonNumber } = req.body as { lessonNumber?: number };
      if (typeof lessonNumber !== "number") {
        res.status(400).json({ error: "LessonNumber are required" });
        return;
      }

      const result = await this.lessonsService.completeLesson(username, lessonNumber);
      res.json(result);
    } catch (error: any) {
      Logger.error("Error submitting lesson progress:", error);
      const status = error.status || 500;
      const message = error.error || "Internal server error";
      res.status(status).json({ error: message });
    }
  }
}
