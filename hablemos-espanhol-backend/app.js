import express from 'express';
import cookieParser from 'cookie-parser';
import Logger from './core/Logger.js';
import OllamaChecker from './core/OllamaChecker.js';

const port = 3000;
const app = express();
app.use(express.json());
app.use(cookieParser());

OllamaChecker.checkModels();

app.get('/', async (req, res) => {

    const ollamaResponse = await fetch("http://ollama:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "phi3",
            stream: false,
            format: "json",
            options: {
                num_predict: 150
            },
            prompt: `Retorne apenas JSON válido.

Formato:
[
  {"front": "palavra ou frase", "back": "resposta correta"}
]

Gere 10 exercícios em espanhol para iniciantes. o front do card deve ser uma frase ou palavra em portugues ou espanhol e atrás a tradução. 
Se por exemplo, a frase do front for em portugues, a back deve ser em espanhol e se a front for em espanhol a de trás deve ser em portugues`
        })
    })

    const ollamaData = await ollamaResponse.json()
    const exercises = JSON.parse(ollamaData.response)

    res.send({
        message: "Lista de Lições aleatorias de Espanhol",
        data: exercises
    })
});

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
