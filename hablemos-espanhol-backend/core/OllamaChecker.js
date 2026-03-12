import Logger from "./Logger.js";

function OllamaChecker() {
    return {
        checkModels: async () => {
            try {
                const res = await fetch("http://ollama:11434/api/tags", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                })

                const data = await res.json();
                Logger.info("OllamaChecker", data);
            } catch (error) {
                Logger.error("OllamaChecker", error);
            }

        }
    }
}

export default OllamaChecker()