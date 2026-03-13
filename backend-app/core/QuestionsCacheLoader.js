import fs from "fs/promises"
import Logger from "./Logger.js";

var questionsArray = [];
var filePath = "/app/data/questionsArray.json";

async function saveData(data) {
  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2)
  )
}

async function loadDataFromDisc() {
    try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        questionsArray = JSON.parse(fileContent)
    } catch (error) {
        Logger.error("Erro ao carregar Perguntas: ", error);
    }
}

function getQuestions(amount) {
    var limit = questionsArray.length >= amount ? amount : questionsArray.length;
    var selectedQuestions = [];

    while (selectedQuestions.length < limit) {
        const questionIndex = Math.floor(Math.random() * questionsArray.length);
        const question = questionsArray[questionIndex];
        if (!selectedQuestions.includes(question)) {
            selectedQuestions.push(question);
        }
    }

    return selectedQuestions;
}

async function executeFetch() {
    Logger.info("[OLLAMA] Fazendo pooling de perguntas");
    const amountOfQuestionToPull = 3;
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

Gere ${amountOfQuestionToPull} exercícios em espanhol para iniciantes. o front do card deve ser uma frase ou palavra em portugues ou espanhol e atrás a tradução. 
Se por exemplo, a frase do front for em portugues, a back deve ser em espanhol e se a front for em espanhol a de trás deve ser em portugues`
        })
    });

    const ollamaData = await ollamaResponse.json()
    const exercises = JSON.parse(ollamaData.response);

    if(exercises.cards){
        Logger.info("exercises.cards[]", exercises.cards);
        questionsArray.push(...exercises.cards); 
    } else if(exercises.length > 0) {
        Logger.info("exercises[]", exercises);
        for (const element of exercises) {
             questionsArray.push(element);
        }       
    } else if(exercises.front){
        Logger.info("{front, back}", exercises);
        questionsArray.push(exercises);
    } else {
        Logger.info("exercises{}", exercises);
        for (const key in exercises) {            
            const element = exercises[key];            
            questionsArray.push(element);
        }
    }

    Logger.info("questionsArray", questionsArray);
    await saveData(questionsArray);
}

async function pollingQuestions() {
    await loadDataFromDisc();

    while (questionsArray.length < 25) {
        try {
            await executeFetch();
        } catch (error) {
            Logger.error("Erro ao fazer pooling das perguntas: ", error);
        }
    }
}


function QuestionsCacheLoader() {
    return {
        getQuestions,
        pollingQuestions
    }
}

export default QuestionsCacheLoader();