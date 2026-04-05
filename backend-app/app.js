import express from 'express';
import cookieParser from 'cookie-parser';
import Logger from './core/Logger.js';
import OllamaChecker from './core/OllamaChecker.js';
import QuestionsCacheLoader from './core/QuestionsCacheLoader.js';
import WordLoader from './core/WordLoader.js';
import exercisesRoutes from './routes/exercises.routes.js';

const port = 3000;
const app = express();
app.use(express.json());
app.use(cookieParser());

OllamaChecker.checkModels();
QuestionsCacheLoader.pollingQuestions();

app.get('/', async (req, res) => {
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

app.listen(port, () => {
    Logger.info(`Servidor rodando em http://localhost:${port}`);
});
