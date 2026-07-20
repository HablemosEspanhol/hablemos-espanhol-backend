import { QuestionsService } from "../modules/exercises/question.service.js";
import { IQuestionsRepository } from "../modules/exercises/iquestions.repository.js";
import { IUserProgressRepository } from "../modules/user/iuser-progress.repository.js";
import { LLMProvider } from "./llm/llm-provider.interface.js";
import { ChatController } from "../modules/chat/chat.controller.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { ExerciseRepository, IExerciseRepository } from "../modules/exercises/exercise.repository.js";
import { ExercisesController } from "../modules/exercises/exercises.controller.js";
import { ExercisesService } from "../modules/exercises/exercises.service.js";
import { UserProgressRepository } from "../modules/user/user-progress.repository.js";
import { PhrasesController } from "../modules/phrases/phrases.controller.js";
import { SwaggerController } from "../modules/swagger/swagger.controller.js";
import { LocalOllama } from "./llm/ollama.provider.js";
import { QuestionsRepository } from "../modules/exercises/questions.repository.js";
import { UserProgressService } from "../modules/user/user-progress.service.js";

const llmProvider: LLMProvider = new LocalOllama();
const questionsRepository: IQuestionsRepository = new QuestionsRepository();
const userProgressRepository: IUserProgressRepository = new UserProgressRepository();
const exercisesRepository: IExerciseRepository = new ExerciseRepository();
const questionsService = new QuestionsService(questionsRepository, llmProvider);
const chatService = new ChatService(llmProvider);
const userProgressService = new UserProgressService(new UserProgressRepository());
const exercisesService = new ExercisesService(exercisesRepository, userProgressRepository, userProgressService, questionsService);

const DI = {
    QuestionsRepository: questionsRepository,
    LocalOllama: llmProvider,
    QuestionsService: questionsService,
    ChatController: new ChatController(chatService, userProgressService),
    ExercisesController: new ExercisesController(exercisesService),
    PhraseController: new PhrasesController(questionsService),
    SwaggerController: new SwaggerController()
};

export default DI;