import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import Logger from './core/Logger.js';
import OllamaChecker from './core/OllamaChecker.js';
import QuestionsCacheLoader from './core/QuestionsCacheLoader.js';
import exercisesRoutes from './routes/exercises.routes.js';
import swaggerDocument from './docs/swagger.js';
import UserProgressService from './core/services/UserProgressService.js';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });

const app = express();
app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => res.send("OK"));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));

app.get('/api/random', async (req, res) => {
    res.send({
        message: "Lista de Lições aleatorias de Espanhol",
        data: QuestionsCacheLoader.getQuestions(10)
    })
});

app.use('/api', exercisesRoutes);

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