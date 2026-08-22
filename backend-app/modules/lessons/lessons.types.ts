import { RowDataPacket } from "mysql2/promise";

export interface ProficiencyLevel {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  focus: string;
}

export interface Lesson {
  id?: number;
  lessonNumber: number;
  title: string;
  goal: string;
  level: ProficiencyLevel['level'];
  examples: string[];
}

export interface LessonProgress {
  userId: number;
  lessonId: number;
  completedDate: Date;
}

export interface ProgressSummary {
  currentLevel: ProficiencyLevel['level'];
  weeklyStreak: number;
  levelProgressPercentage: number;
  estimatedNextLevelDate: string | null;
  completedLessons: number;
  totalLessonsInLevel: number;
}

export interface LessonRow extends RowDataPacket {
  id: number;
  lesson_number: number;
  title: string;
  goal: string;
  level: string;
}

export interface LessonExampleRow extends RowDataPacket {
  id: number;
  lesson_id: number;
  example: string;
}

export interface LessonProgressRow extends RowDataPacket {
  id: number;
  lesson_id: number;
  user_id: number;
  completed_date: string | Date;
}

export interface ProficiencyLevelRow extends RowDataPacket {
  level: string;
  focus: string;
}
