import databasePool from "../../shared/config/database.config.js";
import { Lesson, LessonProgress, LessonRow, LessonExampleRow, ProficiencyLevel } from "./lessons.types.js";
import { InitialLessons } from "./lessons.seed.js";

export class LessonsRepository {
  public getInitialLessons(): Lesson[] {
    return InitialLessons;
  }

  public getInitialProficiencyLevels(): ProficiencyLevel[] {
    return [
      { level: "A1", focus: "Sobrevivência e necessidades básicas" },
      { level: "A2", focus: "Autonomia e situações imprevistas" },
      { level: "B1", focus: "Autonomia prática e expressão pessoal" },
      { level: "B2", focus: "Imersão cultural e fluência social" },
      { level: "C1", focus: "Maestria, nuances e adaptação contextual" },
      { level: "C2", focus: "Fluência nativa e registro técnico" }
    ];
  }

  public async listLessons(): Promise<Lesson[]> {
    const [rows] = await databasePool.query<LessonRow[]>(
      "SELECT id, lesson_number, title, goal, level FROM lessons ORDER BY lesson_number ASC"
    );

    return rows.map(row => ({
      id: row.id,
      lessonNumber: row.lesson_number,
      title: row.title,
      goal: row.goal,
      level: row.level as Lesson['level'],
      examples: []
    }));
  }

  public async listLessonExamples(): Promise<Map<number, string[]>> {
    const [rows] = await databasePool.query<LessonExampleRow[]>(
      "SELECT id, lesson_id, example FROM lesson_examples ORDER BY id ASC"
    );

    const examplesByLesson = new Map<number, string[]>();
    for (const row of rows) {
      const current = examplesByLesson.get(row.lesson_id) ?? [];
      current.push(row.example);
      examplesByLesson.set(row.lesson_id, current);
    }

    return examplesByLesson;
  }

  public async listCompletedLessons(userId: number): Promise<LessonProgress[]> {
    const [rows] = await databasePool.query<any[]>(
      "SELECT user_id, lesson_id, completed_date FROM lessons_user_progress WHERE user_id = ? ORDER BY completed_date ASC",
      [userId]
    );

    return rows.map(row => ({
      userId: Number(row.user_id),
      lessonId: Number(row.lesson_id),
      completedDate: new Date(row.completed_date)
    }));
  }

  public async markLessonComplete(userId: number, lessonId: number): Promise<void> {
    await databasePool.query(
      `INSERT INTO lessons_user_progress (lesson_id, user_id, completed_date)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE completed_date = VALUES(completed_date)`,
      [lessonId, userId]
    );
  }

  public async seedBaseData(): Promise<void> {
    const levels = this.getInitialProficiencyLevels();
    for (const level of levels) {
      await databasePool.query(
        `INSERT INTO proficiency_levels (level, focus)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE focus = VALUES(focus)`,
        [level.level, level.focus]
      );
    }

    const lessons = this.getInitialLessons();
    for (const lesson of lessons) {
      await databasePool.query(
        `INSERT INTO lessons (lesson_number, title, goal, level)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), goal = VALUES(goal), level = VALUES(level)`,
        [lesson.lessonNumber, lesson.title, lesson.goal, lesson.level]
      );
    }

    const [lessonRows] = await databasePool.query<LessonRow[]>(
      "SELECT id, lesson_number, title, goal, level FROM lessons"
    );
    const lessonIdByNumber = new Map(lessonRows.map(row => [row.lesson_number, row.id]));

    for (const lesson of lessons) {
      const lessonId = lessonIdByNumber.get(lesson.lessonNumber);
      if (!lessonId) continue;
      for (const example of lesson.examples) {
        await databasePool.query(
          `INSERT INTO lesson_examples (lesson_id, example)
           VALUES (?, ?)`,
          [lessonId, example]
        );
      }
    }
  }
}
