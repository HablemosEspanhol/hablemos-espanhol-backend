import UserProgressRepository from "./user-progress.repository.js";
import ExerciseRepository from "./exercise.repository.js";
import QuestionsRepository from "./questions.repository.js";

const ExercisesService = {
    getExercisesByUsername: async (username) => {
        const userLevel = await UserProgressRepository.getUserLevel(username);
        const phrasesToReview = await UserProgressRepository.getPhraseProgress(username, 5);
        const phrases = QuestionsRepository.getPhrasesForExercises(userLevel, 10, phrasesToReview);
        if (phrases.length < 10) {
            const fallbackPhrases = QuestionsRepository.getPhrasesForExercises('A1', 10);
            phrases.push(...fallbackPhrases.slice(0, 10 - phrases.length));
        }

        const exercises = ExerciseRepository.generateExercises(phrases);
        await UserProgressRepository.storeExercises(username, exercises);

        const publicExercises = exercises.map(({ correctAnswer, instanceId, ...exercise }) => exercise);
        return publicExercises;
    },
    checkOneExercise: async (username, answer)=> {
        
        const hasUserAnswer = answer && (
            typeof answer.answer !== 'undefined' ||
            typeof answer.userAnswer !== 'undefined'
        );

        if (!username || !answer?.exerciseId || !hasUserAnswer) {
            throw { status: 400, error: 'Invalid request body' }
        }

        const result = await UserProgressRepository.checkExerciseAnswer(username, answer);

        if (!result) {
            throw { status: 404, error: 'Exercise not found for user' }
        }

        return result;
    },
    validateExercise: async (username, answers) => {
        const invalidAnswer = Array.isArray(answers)
            ? answers.some(answer => !answer || !answer.exerciseId || (typeof answer.answer === 'undefined' && typeof answer.userAnswer === 'undefined' && typeof answer.correct === 'undefined'))
            : true;

        if (!username || !answers || !Array.isArray(answers) || invalidAnswer) {
            throw { 
                status: 400,
                error: 'Invalid request body'
            };
        }

        const result = await UserProgressRepository.updateProgress(username, answers);

        let message = '';
        if (result.accuracy >= 80) {
            message = `Excelente! ${result.accuracy}% correto. Parabéns, você subiu para ${result.newLevel}!`;
        } else if (result.accuracy >= 60) {
            message = `Bom! ${result.accuracy}% correto. Continue praticando no nível ${result.newLevel}.`;
        } else if (result.accuracy >= 50) {
            message = `Você acertou ${result.accuracy}%. Continue tentando no nível ${result.newLevel}.`;
        } else {
            message = `${result.accuracy}% correto. Você desceu para ${result.newLevel}. Tente novamente!`;
        }

        var response = {
            accuracy: result.accuracy,
            newLevel: result.newLevel,
            message
        };

        return response;
    }
}

export default ExercisesService