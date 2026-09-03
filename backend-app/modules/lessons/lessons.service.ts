import { LessonsRepository } from "./lessons.repository.js";
import { CompleteLessonResponse, ProgressSummary } from "./lessons.types.js";
import { UserProgressService } from "../user/user-progress.service.js";
import { IUserProgressRepository } from "../user/iuser-progress.repository.js";

export class LessonsService {
  private readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

  constructor(
    private readonly repository: LessonsRepository,
    private readonly userProgressRepository: IUserProgressRepository,
    private readonly userProgressService: UserProgressService
  ) {}

  public async getProgressSummary(username: string): Promise<ProgressSummary> {
    const user = await this.userProgressService.getOrCreateUser(username);
    const allLessons = await this.repository.listLessons();
    const completedLessons = await this.repository.listCompletedLessons(user.id);
    const completedLessonIds = new Set(completedLessons.map(x => x.lessonId));
    const allCompletedLessons = completedLessons.map(entry => ({
      ...entry,
      lesson: allLessons.find(lesson => lesson.id === entry.lessonId)
    }));

    const lessonsInLevel = allLessons.filter(lesson => lesson.level === user.nivelAtual);
    const completedInCurrentLevel = lessonsInLevel.filter(lesson => lesson.id && completedLessonIds.has(lesson.id)).length;
    const totalLessonsInLevel = lessonsInLevel.length;
    const levelProgressPercentage = totalLessonsInLevel > 0
      ? Math.round((completedInCurrentLevel / totalLessonsInLevel) * 100)
      : 0;

    const weeklyStreak = this.calculateWeeklyStreak(completedLessons.map(x => x.completedDate));
    const estimatedNextLevelDate = this.calculateEstimatedNextLevelDate(completedInCurrentLevel, totalLessonsInLevel, completedLessons.map(x => x.completedDate));

    return {
      currentLevel: user.nivelAtual as ProgressSummary['currentLevel'],
      weeklyStreak,
      levelProgressPercentage,
      estimatedNextLevelDate,
      completedLessons: completedInCurrentLevel,
      totalLessonsInLevel
    };
  }

  public async completeLesson(username: string, lessonNumber: number): Promise<CompleteLessonResponse> {
    const user = await this.userProgressService.getOrCreateUser(username);
    const lessons = await this.repository.listLessons();
    const lesson = lessons.find(l => l.lessonNumber === lessonNumber);
    if (!lesson?.id) {
      throw { status: 404, error: "Lesson not found" };
    }

    await this.repository.markLessonComplete(user.id, lesson.id);
    return { message: "Lesson progress saved" };
  }

  private calculateWeeklyStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    const uniqueWeeks = new Set<string>();
    for (const date of dates) {
      uniqueWeeks.add(this.getWeekKey(date));
    }

    const sortedWeeks = Array.from(uniqueWeeks).sort();
    const newest = sortedWeeks[sortedWeeks.length - 1];
    let streak = 1;
    let cursor = this.getPreviousWeekKey(newest);

    while (uniqueWeeks.has(cursor)) {
      streak += 1;
      cursor = this.getPreviousWeekKey(cursor);
    }

    return streak;
  }

  private getWeekKey(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const firstJan = new Date(year, 0, 1);
    const dayOfYear = Math.floor((d.getTime() - firstJan.getTime()) / 86400000) + 1;
    const week = Math.ceil(dayOfYear / 7);
    return `${year}-${week}`;
  }

  private getPreviousWeekKey(weekKey: string): string {
    const [yearRaw, weekRaw] = weekKey.split('-');
    const year = Number(yearRaw);
    const week = Number(weekRaw);
    if (!Number.isFinite(year) || !Number.isFinite(week)) return weekKey;
    if (week > 1) return `${year}-${week - 1}`;
    return `${year - 1}-52`;
  }

  private calculateEstimatedNextLevelDate(
    completedInCurrentLevel: number,
    totalLessonsInLevel: number,
    completedDates: Date[]
  ): string | null {
    if (completedInCurrentLevel <= 0 || totalLessonsInLevel <= 0 || completedDates.length === 0) {
      return null;
    }

    const sorted = [...completedDates].sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const elapsedDays = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / 86400000) + 1);
    const rate = completedInCurrentLevel / elapsedDays;
    if (rate <= 0) return null;

    const remaining = Math.max(0, totalLessonsInLevel - completedInCurrentLevel);
    const estimatedDays = Math.ceil(remaining / rate);
    const estimated = new Date(last.getTime() + estimatedDays * 86400000);
    return estimated.toISOString();
  }
}
