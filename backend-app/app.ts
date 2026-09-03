import express from 'express';
import cookieParser from 'cookie-parser';
import Logger from './shared/Logger.js';
import DI from './shared/di.js';
import { RegisterRoutes } from "./build/routes.js";
import { setupSwagger } from './shared/swagger.middleware.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
RegisterRoutes(app);


app.get('/', (_, res) => res.send("OK"));
setupSwagger(app, '/swagger');

app.use((err: any, req: any, res: any, next: any) => {
    Logger.error(err);
    const status = err.status || 500;
    const mensagem = err.message || 'Erro interno no servidor';

    res.status(status).json({
        status: status,
        message: mensagem,
    });
});



process.on('unhandledRejection', (reason, promise) => { 
    Logger.error('⚠️ [GlobalExceptionHandler][unhandledRejection] Rejeição não tratada em: '+ promise + ' razão: '+ reason);
});

process.on('uncaughtException', (error) => {
    Logger.error('🚨 [GlobalExceptionHandler][uncaughtException] ERRO CRÍTICO: '+ error);
});


export default app;
