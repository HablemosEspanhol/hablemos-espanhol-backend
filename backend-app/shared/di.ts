import { QuestionsService } from "../modules/exercises/question.service.js";
import { IQuestionsRepository } from "../modules/exercises/iquestions.repository.js";
import { IUserProgressRepository } from "../modules/user/iuser-progress.repository.js";
import { LLMProvider } from "./llm/llm-provider.interface.js";
import { ChatController } from "../modules/chat/chat.controller.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { ExerciseRepository, IExerciseFactory } from "../modules/exercises/exercise.factory.js";
import { ExercisesController } from "../modules/exercises/exercises.controller.js";
import { ExercisesV2Controller } from "../modules/exercises/exercises-v2.controller.js";
import { ExercisesService } from "../modules/exercises/exercises.service.js";
import { UserProgressRepository } from "../modules/user/user-progress.repository.js";
import { PhrasesController } from "../modules/phrases/phrases.controller.js";
import { SwaggerController } from "../modules/swagger/swagger.controller.js";
import { LocalOllama } from "./llm/ollama.provider.js";
import { QuestionsRepository } from "../modules/exercises/questions.repository.js";
import { UserProgressService } from "../modules/user/user-progress.service.js";
import { GeminiLLMProvider } from "./llm/gemini.provider.js";
import { AuthService } from "../modules/auth/auth.service.js";
import { AuthController } from "../modules/auth/auth.controller.js";
import { UserRepository } from "./user.repository.js";

// const llmProvider: LLMProvider = new LocalOllama();
const llmProvider: LLMProvider = new GeminiLLMProvider();
const questionsRepository: IQuestionsRepository = new QuestionsRepository();
const usersRepository = new UserRepository();
const userProgressRepository: IUserProgressRepository = new UserProgressRepository(usersRepository);
const exercisesRepository: IExerciseFactory = new ExerciseRepository();
const questionsService = new QuestionsService(questionsRepository, llmProvider);
const chatService = new ChatService(llmProvider);
const userProgressService = new UserProgressService(userProgressRepository);
const exercisesService = new ExercisesService(exercisesRepository, userProgressRepository, userProgressService, questionsService);
const authService = new AuthService(usersRepository);

const DI = {
    QuestionsRepository: questionsRepository,
    LLMProvider: llmProvider,
    QuestionsService: questionsService,
    AuthService: authService,
    ChatController: new ChatController(chatService, userProgressService),
    ExercisesController: new ExercisesController(exercisesService),
    ExercisesV2Controller: new ExercisesV2Controller(exercisesService),
    PhraseController: new PhrasesController(questionsService),
    AuthController: new AuthController(authService),
    SwaggerController: new SwaggerController()
};

export default DI;
