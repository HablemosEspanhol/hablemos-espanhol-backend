import { Router } from "express";

export abstract class BaseController {
    private readonly router: Router;

    constructor(){
        this.router = Router();
        this.initializeRoutes(this.router);
    }

    /**
     * Retorna o roteador para acoplamento central na aplicação (app.ts)
     */
    public getRouter(): Router {
        return this.router;
    }
    
    protected abstract initializeRoutes(router: Router): void;
}