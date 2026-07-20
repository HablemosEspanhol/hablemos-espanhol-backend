import { QuestionsService } from "../application/question.service.js";
import { IQuestionsRepository } from "../domain/repository/IQuestionsRepository.js";
import { IUserProgressRepository } from "../domain/repository/IUserProgressRepository.js";
import { LLMProvider } from "../domain/services/LLMProvider.js";
import { ChatController } from "../modules/chat/chat.controller.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { ExerciseRepository, IExerciseRepository } from "./repository/exercise.repository.js";
import { ExercisesController } from "../modules/exercises/exercises.controller.js";
import { ExercisesService } from "../modules/exercises/exercises.service.js";
import { UserProgressRepository } from "./repository/user-progress.repository.js";
import { PhrasesController } from "../modules/phrases/phrases.controller.js";
import { SwaggerController } from "../modules/swagger/swagger.controller.js";
import { LocalOllama } from "./llm/ollama.provider.js";
import { QuestionsRepository } from "./repository/questions.repository.js";

const llmProvider: LLMProvider = new LocalOllama();
const questionsRepository: IQuestionsRepository = new QuestionsRepository();
const userProgressRepository: IUserProgressRepository = new UserProgressRepository();
const exercisesRepository: IExerciseRepository = new ExerciseRepository();
const questionsService = new QuestionsService(questionsRepository, llmProvider);
const chatService = new ChatService(llmProvider);
const exercisesService = new ExercisesService(exercisesRepository, userProgressRepository, questionsService);

const DI = {
    QuestionsRepository: questionsRepository,
    LocalOllama: llmProvider,
    QuestionsService: questionsService,
    ChatController: new ChatController(chatService, userProgressRepository),
    ExercisesController: new ExercisesController(exercisesService),
    PhraseController: new PhrasesController(questionsService),
    SwaggerController: new SwaggerController()
};

export default DI;