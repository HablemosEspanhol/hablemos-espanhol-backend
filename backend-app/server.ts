import dotenv from 'dotenv';
import app from "./app.js";
import Logger from "./shared/Logger.js";
import DI from './shared/di.js';
import { isMock } from './shared/config/cmd-args.config.js';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });

const port = process.env.PORT || 3000;
const enablePolling = process.env.ENABLE_POLL_QUESTIONS === "true";

async function pollingQuestions() {
    if(!enablePolling) {
        Logger.warning("[LLM] Background PollingQuestions is disabled");
        return;
    }

    try {
        Logger.info("Lendo dados previamente salvos");
        await DI.QuestionsRepository.loadDataFromDisc();

        var llmProvider = DI.LocalOllama;

        if(await llmProvider.checkModels(llmProvider.model, isMock)) {
            DI.QuestionsService.pollingQuestions();
        } else {
            Logger.warning("Modelo de IA indisponivel no "+llmProvider.providerName.toUpperCase());
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