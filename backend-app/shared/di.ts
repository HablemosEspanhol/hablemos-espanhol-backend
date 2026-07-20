import { QuestionsService } from "../application/question.service.js";
import { LocalOllama } from "./llm/ollama.provider.js";
import { QuestionsRepository } from "./repository/QuestionsRepository.js";

const ollama = new LocalOllama();
const questionsRepository = new QuestionsRepository();
const questionsService = new QuestionsService(questionsRepository, ollama);

const DI = {
    QuestionsRepository: questionsRepository,
    LocalOllama: ollama,
    QuestionsService: questionsService
};

export default DI;