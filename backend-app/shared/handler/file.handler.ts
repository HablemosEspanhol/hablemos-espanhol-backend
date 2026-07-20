import fs from "fs/promises";
import Logger from "../Logger.js";

export interface FileObject<T> { update: (defaultObject: T) => Promise<T>, load: (defaultObject: T) => Promise<T> }

export const FileHandler = <T>(path: string) => {
  const update = async function (data: T): Promise<void> {
    await fs.writeFile(path, JSON.stringify(data, null, 2));
  };

  const load = async function (defaultObject: T): Promise<T> {
    try {
      const fileContent = await fs.readFile(path, "utf-8");
      return JSON.parse(fileContent) as T;
    } catch (error: any) {
      Logger.error("Erro ao carregar Arquivo: ", error.message);
      return defaultObject;
    }
  };

  return { update, load } as FileObject<T>;
};