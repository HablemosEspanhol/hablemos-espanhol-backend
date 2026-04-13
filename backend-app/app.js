import express from 'express';
import cookieParser from 'cookie-parser';
import Logger from './shared/Logger.js';
import exercisesRoutes from './modules/exercises/exercises.controller.js';
import swaggerController from './modules/swagger/swagger.controller.js';
import phrasesController from './modules/phrases/phrases.controller.js';
import chatController from './modules/chat/chat.controller.js'

const app = express();
app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => res.send("OK"));
app.use('/api/exercises', exercisesRoutes);
app.use('/api/phrases', phrasesController);
app.use('/api/chat', chatController);
app.use('/swagger', swaggerController);

app.use((err, req, res, next) => {
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