import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import Logger from './Logger.js';

/**
 * Registra o middleware do Swagger UI na aplicação Express.
 * 
 * @param app Instância do servidor Express
 * @param routePath Caminho da rota onde o Swagger será servido (padrão: '/swagger')
 */
export const setupSwagger = (app: Express, routePath: string = '/swagger'): void => {
  try {
    if(process.env.SWAGGER_ENABLED != "true") {
      Logger.warning(`[Swagger] Swagger desabilitado via variável de ambiente SWAGGER_ENABLED`);
      return;
    };

    const swaggerSpecPath = path.resolve('./build/swagger.json');

    if (!fs.existsSync(swaggerSpecPath)) {
      Logger.warning(`[Swagger] Arquivo ${swaggerSpecPath} não encontrado. Execute 'tsoa spec-and-routes' primeiro.`);
      return;
    }

    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));

    // Configura a rota do Swagger UI
    app.use(routePath, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    Logger.info(`[Swagger] Documentação disponível em ${routePath}`);
  } catch (error) {
    Logger.error('[Swagger] Erro ao carregar a documentação:', error);
  }
};