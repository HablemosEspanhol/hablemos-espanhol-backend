import dotenv from 'dotenv';
import app from "./app.js";
import Logger from "./shared/Logger.js";
import OllamaChecker from "./shared/services/OllamaChecker.js";
import questionsRepository from './modules/exercises/questions.repository.js';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });

const port = process.env.PORT;
const ollamanAdress = 'http://host.docker.internal:11434'

async function pollingQuestions() {
    try {
        OllamaChecker.setUrl(ollamanAdress);
        questionsRepository.setUrl(ollamanAdress);

        Logger.info("Lendo dados previamente salvos");
        await questionsRepository.loadDataFromDisc()

        if(await OllamaChecker.checkModels(questionsRepository.model)) {
            questionsRepository.pollingQuestions();
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