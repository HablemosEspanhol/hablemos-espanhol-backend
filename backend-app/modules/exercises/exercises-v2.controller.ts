import { NextFunction, Request, Response, Router } from "express";
import { BaseController } from "../../shared/base.controller.js";
import { ExercisesService } from "./exercises.service.js";
import Logger from "../../shared/Logger.js";
import { PublicExercise } from "./exercises.types.js";

export class ExercisesV2Controller extends BaseController {

    constructor(private readonly exercisesService: ExercisesService) {
        super();
        if (exercisesService == null) throw new Error("[ExercisesV2Controller] exercisesService is null");
    }

    protected initializeRoutes(router: Router): void {
        router.get('/', this.getExercisesV2.bind(this));
    }

    private async getExercisesV2(req: Request, res: Response) : Promise<void>{
        try {
            const username = req.headers['x-auth-username'] as string;

            if (!username) {
                res.status(400).json({ error: 'Username is required' });
                return;
            }

            const exercises: PublicExercise[] = await this.exercisesService.getExercisesByUsernameUsingAI(username);
            res.json(exercises);
        } catch (error: any) {
            Logger.error('Error generating exercises:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}