import dotenv from 'dotenv';
import app from "./app.js";
import Logger from "./shared/Logger.js";
import OllamaChecker from "./shared/services/OllamaChecker.js";
import QuestionsCacheLoader from "./shared/services/QuestionsCacheLoader.js";

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });

const port = process.env.PORT;
const ollamanAdress = 'http://host.docker.internal:11434'

async function pollingQuestions() {
    try {
        OllamaChecker.setUrl(ollamanAdress);
        QuestionsCacheLoader.setUrl(ollamanAdress);

        Logger.info("Lendo dados previamente salvos");
        await QuestionsCacheLoader.loadDataFromDisc()

        if(await OllamaChecker.checkModels(QuestionsCacheLoader.model)) {
            QuestionsCacheLoader.pollingQuestions();
        } else {
            Logger.error("Modelo de IA indisponivel no OLLAMA");
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