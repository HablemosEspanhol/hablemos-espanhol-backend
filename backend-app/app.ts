import express from 'express';
import cookieParser from 'cookie-parser';
import Logger from './shared/Logger.js';
import DI from './shared/di.js';

const app = express();
app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => res.send("OK"));
app.use('/api/exercises', DI.ExercisesController.getRouter());
app.use('/api/phrases', DI.PhraseController.getRouter());
app.use('/api/chat', DI.ChatController.getRouter());
app.use('/swagger', DI.SwaggerController.getRouter());

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