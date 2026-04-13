import UserProgressService from "../../shared/data/UserProgressRepository.js";
import ExerciseService from "../../shared/services/ExerciseService.js";
import QuestionsCacheLoader from "../../shared/services/QuestionsCacheLoader.js";

const ExercisesService = {
    getExercisesByUsername: async (username)=> {        
        const userLevel = await UserProgressService.getUserLevel(username);
        const phrasesToReview = await UserProgressService.getPhraseProgress(username, 5);
        const phrases = QuestionsCacheLoader.getPhrasesForExercises(userLevel, 10, phrasesToReview);
        if (phrases.length < 10) {
        const fallbackPhrases = QuestionsCacheLoader.getPhrasesForExercises('A1', 10);
        phrases.push(...fallbackPhrases.slice(0, 10 - phrases.length));
        }

        const exercises = ExerciseService.generateExercises(phrases);
        await UserProgressService.storeExercises(username, exercises);

        const publicExercises = exercises.map(({ correctAnswer, instanceId, ...exercise }) => exercise);
        return publicExercises;
    }
}

export default ExercisesService