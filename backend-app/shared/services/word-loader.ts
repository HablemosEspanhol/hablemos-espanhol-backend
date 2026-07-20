import fs from 'fs/promises';

export interface IWordLoader {
  loadAll(): Promise<string[]>;
  load(quantidade: number): Promise<string[]>;
}

export class WordLoader implements IWordLoader {
  // Tornamos o caminho do arquivo parametrizável via construtor para facilitar testes
  constructor(
    private readonly filePath: string = './1000-palavras.md'
  ) {}

  /**
   * Carrega todas as palavras do arquivo Markdown e aplica os filtros e mapeamentos de string.
   */
  public async loadAll(): Promise<string[]> {
    const data = await fs.readFile(this.filePath, 'utf-8');
    
    return data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.split("_")[1].split('-')[0].trim());
  }

  /**
   * Seleciona uma quantidade aleatória e única de palavras sem repetição.
   */
  public async load(quantidade: number): Promise<string[]> {
    // 💡 Correção: Adicionado o await necessário para obter o array de strings
    const linhas = await this.loadAll();
    const total = linhas.length;

    // Garante que não tentaremos ler mais palavras do que o total disponível
    const quantidadeAlvo = Math.min(quantidade, total);
    const indices = new Set<number>();

    while (indices.size < quantidadeAlvo) {
      const randomIndex = Math.floor(Math.random() * total);
      indices.add(randomIndex);
    }

    return [...indices].map(i => linhas[i]);
  }
}

// Exporta como Singleton mantendo compatibilidade com as chamadas no resto do ecossistema da aplicação
export default new WordLoader();