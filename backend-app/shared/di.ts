import { QuestionsService } from "../modules/exercises/question.service.js";
import { IQuestionsRepository } from "../modules/exercises/iquestions.repository.js";
import { IUserProgressRepository } from "../modules/user/iuser-progress.repository.js";
import { LLMProvider } from "./llm/llm-provider.interface.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { ExerciseRepository, IExerciseFactory } from "../modules/exercises/exercise.factory.js";
import { ExercisesService } from "../modules/exercises/exercises.service.js";
import { UserProgressRepository } from "../modules/user/user-progress.repository.js";
import { QuestionsRepository } from "../modules/exercises/questions.repository.js";
import { UserProgressService } from "../modules/user/user-progress.service.js";
import { AuthService } from "../modules/auth/auth.service.js";
import { UserRepository } from "./user.repository.js";
import { LessonsRepository } from "../modules/lessons/lessons.repository.js";
import { LessonsService } from "../modules/lessons/lessons.service.js";
import { llmProviderFactory } from "./llm/llm-provide.factory.js";

const llmProvider: LLMProvider = llmProviderFactory();
const questionsRepository: IQuestionsRepository = new QuestionsRepository();
const usersRepository = new UserRepository();
const userProgressRepository: IUserProgressRepository = new UserProgressRepository(usersRepository);
const exercisesRepository: IExerciseFactory = new ExerciseRepository();
const questionsService = new QuestionsService(questionsRepository, llmProvider);
const chatService = new ChatService(llmProvider);
const userProgressService = new UserProgressService(userProgressRepository);
const exercisesService = new ExercisesService(exercisesRepository, userProgressRepository, userProgressService, questionsService);
const authService = new AuthService(usersRepository);
const lessonsRepository = new LessonsRepository();
const lessonsService = new LessonsService(lessonsRepository, userProgressRepository, userProgressService);

const DI = {
    QuestionsRepository: questionsRepository,
    LessonsRepository: lessonsRepository,
    LLMProvider: llmProvider,
    QuestionsService: questionsService,
    AuthService: authService,
    ChatService: chatService,
    UserProgressService: userProgressService,
    ExercisesService: exercisesService,
    LessonsService: lessonsService,
};

export default DI;
