import dotenv from 'dotenv';
import app from "./app.js";
import Logger from "./shared/Logger.js";
import OllamaChecker from "./shared/services/OllamaChecker.js";
import { QuestionsService } from "./application/question.service.js";
import { LocalOllama } from './shared/llm/ollama.provider.js';
import { QuestionsRepository } from './shared/repository/questions.repository.js';
import DI from './shared/di.js';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });

const port = process.env.PORT || 3000;

async function pollingQuestions() {
    try {
        Logger.info("Lendo dados previamente salvos");
        await DI.QuestionsRepository.loadDataFromDisc();

        if(await OllamaChecker.checkModels(DI.LocalOllama.model)) {
            DI.QuestionsService.pollingQuestions();
        } else {
            Logger.warning("Modelo de IA indisponivel no OLLAMA");
            setTimeout(()=> {
                Logger.info("RETRY pollingQuestions()")
                pollingQuestions();
            }, 60000)
        }
    } catch (error) {
        Logger.error("Error on pollingQuestions()", error)
    }    
}

pollingQuestions();

app.listen(port, () => {
    Logger.info(`Servidor rodando em http://localhost:${port}`);
});