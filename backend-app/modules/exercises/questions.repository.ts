import Logger from "../../shared/Logger.js";
import { QuestionV1, QuestionCache, ParsedWordData } from "./questions.types.js";
import { FileHandler, FileObject } from "../../shared/handler/file.handler.js";
import { IQuestionsRepository } from "./iquestions.repository.js";

export class QuestionsRepository implements IQuestionsRepository {
  private questionsArray: QuestionV1[] = [];
  private questionFromWordCache: QuestionCache = {};

  private readonly fileV1: FileObject<QuestionV1[]>;
  private readonly fileV2: FileObject<QuestionCache>;

  constructor(
    private readonly filePath: string = "/app/data/questionsArray.json",
    private readonly filePathV2: string = "/app/data/questionsArrayV2.json"
  ) {
    this.fileV1 = FileHandler<QuestionV1[]>(this.filePath);
    this.fileV2 = FileHandler<QuestionCache>(this.filePathV2);
  }

  public async loadDataFromDisc(): Promise<void> {
    this.questionFromWordCache = await this.fileV2.load({});
    // this.questionsArray = await this.fileV1.load([]);
  }

  public getQuestionsArray(): QuestionV1[] {
    return this.questionsArray;
  }

  public async saveQuestionsArray(questions: QuestionV1[]): Promise<void> {
    this.questionsArray = questions;
    await this.fileV1.update(this.questionsArray);
  }

  public getCacheByNivel(nivel: string): Record<string, ParsedWordData> | undefined {
    return this.questionFromWordCache[nivel];
  }

  public getCacheComplete(): QuestionCache {
    return this.questionFromWordCache;
  }

  public async saveCacheComplete(cache: QuestionCache): Promise<void> {
    this.questionFromWordCache = cache;
    await this.fileV2.update(this.questionFromWordCache);
  }

  public async updateNivelCache(nivel: string, word: string, data: ParsedWordData): Promise<void> {
    if (!this.questionFromWordCache[nivel]) {
      this.questionFromWordCache[nivel] = {};
    }
    this.questionFromWordCache[nivel][word] = data;
    await this.fileV2.update(this.questionFromWordCache);
  }

  public async ensureNivelExists(nivel: string): Promise<void> {
    if (!this.questionFromWordCache[nivel]) {
      this.questionFromWordCache[nivel] = {};
      await this.fileV2.update(this.questionFromWordCache);
    }
  }
}