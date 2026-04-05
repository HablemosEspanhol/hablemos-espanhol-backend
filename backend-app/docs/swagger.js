const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Hablemos Espanhol Backend API',
    version: '1.0.0',
    description: 'API para gerar exercícios de espanhol, submeter resultados e acompanhar progresso de usuário.',
    contact: {
      name: 'Hablemos Espanhol',
      email: 'suporte@example.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local'
    }
  ],
  paths: {
    '/': {
      get: {
        summary: 'Rota raiz',
        description: 'Retorna uma lista de perguntas aleatórias em cache.',
        responses: {
          '200': {
            description: 'Retorna mensagem e lista de perguntas aleatórias',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          front: { type: 'string' },
                          back: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/exercises': {
      get: {
        tags: ['Exercises'],
        summary: 'Gerar exercícios para um usuário',
        description: 'Retorna um conjunto de exercícios mistos baseado no nível do usuário.',
        parameters: [
          {
            name: 'username',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Nome de usuário que identifica o aluno'
          }
        ],
        responses: {
          '200': {
            description: 'Lista de exercícios gerados',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Exercise' }
                }
              }
            }
          },
          '400': {
            description: 'Parâmetro username ausente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Erro interno do servidor',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/phrases': {
      get: {
        tags: ['Phrases'],
        summary: 'Listar frases por nível com paginação',
        description: 'Retorna todas as frases mapeadas para um nível específico, com paginação para curadoria.',
        parameters: [
          {
            name: 'level',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
            description: 'Nível de dificuldade das frases'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Número da página (começando em 1)'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Número de frases por página'
          }
        ],
        responses: {
          '200': {
            description: 'Lista paginada de frases',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhrasesResponse' }
              }
            }
          },
          '400': {
            description: 'Parâmetros inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Erro interno do servidor',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/exercises/submit': {
      post: {
        tags: ['Exercises'],
        summary: 'Enviar resultados de exercícios',
        description: 'Recebe as respostas do usuário e atualiza o progresso em memória.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubmitRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Resultado do envio e progresso atualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubmitResponse' }
              }
            }
          },
          '400': {
            description: 'Requisição inválida',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Erro interno do servidor',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Exercise: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['translation', 'fill_blank', 'multiple_choice'] },
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            nullable: true
          },
          correctAnswer: { type: 'string', description: 'Campo interno usado pelo backend para validações; não é retornado no GET /api/exercises' },
          palavra: { type: 'string' }
        },
        required: ['id', 'type', 'question']
      },
      SubmitAnswer: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string' },
          answer: { type: 'string', description: 'Resposta enviada pelo usuário' },
          userAnswer: { type: 'string', description: 'Resposta enviada pelo usuário (alias)' },
          correct: { type: 'boolean', description: 'Campo opcional para compatibilidade com cliente antigo' }
        },
        required: ['exerciseId']
      },
      SubmitRequest: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          answers: {
            type: 'array',
            items: { $ref: '#/components/schemas/SubmitAnswer' }
          }
        },
        required: ['username', 'answers']
      },
      SubmitResponse: {
        type: 'object',
        properties: {
          accuracy: { type: 'integer', description: 'Porcentagem de acerto' },
          newLevel: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['accuracy', 'newLevel', 'message']
      },
      PhrasesResponse: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Phrase' }
          }
        },
        required: ['level', 'total', 'page', 'limit', 'totalPages', 'data']
      },
      Phrase: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          palavra: { type: 'string' },
          texto: { type: 'string' },
          traduccion: { type: 'string' },
          nivel: { type: 'string' }
        },
        required: ['id', 'palavra', 'texto', 'traduccion', 'nivel']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        },
        required: ['error']
      }
    }
  }
};

export default swaggerDocument;
