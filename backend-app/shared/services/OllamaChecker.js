import { isMock } from "../config/cmd-args.config.js";
import Logger from "../Logger.js";

var url = "http://ollama:11434";

function OllamaChecker() {

    return {
        setUrl: (newUrl) => url = newUrl,
        checkModels: async (model) => {
            try {
                if (isMock) return Promise.resolve();

                Logger.info("Checking IA model " + model)

                const res = await fetch(url + "/api/tags", {
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