import { isMock } from "../config/cmd-args.config.js";
import Logger from "../Logger.js";
import { OLLAMA_URL } from "../config/LLMConfig.js";

function OllamaChecker() {

    return {
        checkModels: async (model) => {
            try {
                if (isMock) return Promise.resolve();

                Logger.info("Checking IA model " + model)

                const res = await fetch(OLLAMA_URL + "/api/tags", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                })

                const data = await res.json();
                Logger.info("OllamaChecker", data);
                return JSON.stringify(data).includes(model);
            } catch (error) {
                Logger.warning("OllamaChecker", error);
            }

        }
    }
}

export default OllamaChecker()