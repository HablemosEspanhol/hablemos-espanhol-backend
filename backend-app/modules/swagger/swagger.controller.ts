import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.js';
import { BaseController } from '../base.controller.js';

export class SwaggerController extends BaseController{
    initializeRoutes(router: Router) {
        router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        router.get('/swagger.json', (_, res) => res.json(swaggerDocument));
    }
}