import databasePool from "../../shared/config/database.config.js";
import { ExercisePhraseInput } from "./exercises.types.js";

export interface GeneratedExerciseRecord extends ExercisePhraseInput {
  id: string;
}

export class ExerciseV3Repository {
  public async listGeneratedExercises(): Promise<GeneratedExerciseRecord[]> {
    const [rows] = await databasePool.query<any[]>(
      "SELECT id, palavra, texto, traduccion FROM exercise_v3_bank ORDER BY created_at DESC"
    );
    return rows.map(row => ({
      id: row.id,
      palavra: row.palavra,
      texto: row.texto,
      traduccion: row.traduccion
    }));
  }

  public async saveGeneratedExercises(exercises: GeneratedExerciseRecord[]): Promise<void> {
    if (exercises.length === 0) return;
    const values = exercises.map(ex => [ex.id, ex.palavra, ex.texto, ex.traduccion]);
    await databasePool.query(
      `INSERT INTO exercise_v3_bank (id, palavra, texto, traduccion)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         palavra = VALUES(palavra),
         texto = VALUES(texto),
         traduccion = VALUES(traduccion)`,
      [values]
    );
  }
}
