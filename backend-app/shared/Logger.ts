export type LogType = 'log' | 'error' | 'warn';

export class LoggerService {
  constructor() {}

  /**
   * Obtém a data e hora local atual formatada como string ISO, 
   * compensando o offset do fuso horário local.
   */
  private getLocalDateTimeAsString(): string {
    const dataLocal = new Date();
    const offset = dataLocal.getTimezoneOffset() * 60000;
    const dataAjustada = new Date(dataLocal.getTime() - offset);
    return dataAjustada.toISOString().slice(0, -1);
  }

  /**
   * Método genérico centralizador de saída de logs no console.
   */
  private genericLog(type: LogType, ...message: unknown[]): void {
    const timestamp = this.getLocalDateTimeAsString();
    // Exibe a tag em caixa alta baseado no tipo correto de console ('LOG', 'ERROR', 'WARN')
    const displayTag = type === 'log' ? 'INFO' : type.toUpperCase();
    
    console[type](timestamp, displayTag, ...message);
  }

  /**
   * Registra uma mensagem informativa padrão.
   */
  public info(...message: unknown[]): void {
    this.genericLog('log', ...message);
  }

  /**
   * Registra um log de erro crítico.
   */
  public error(...message: unknown[]): void {
    this.genericLog('error', ...message);
  }

  /**
   * Registra um aviso ou alerta do sistema.
   */
  public warning(...message: unknown[]): void {
    this.genericLog('warn', ...message);
  }
}

// Exporta como um Singleton para manter compatibilidade absoluta de importação
export default new LoggerService();