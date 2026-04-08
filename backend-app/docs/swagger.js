const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Hablemos Espanhol Backend API',
    version: '1.0.0',
    description: 'API para gerar exercicios de espanhol, submeter resultados e acompanhar progresso de usuario.',
    contact: {
      name: 'Hablemos Espanhol',
      email: 'suporte@example.com'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Servidor local'
    }
  ],
  paths: {
    '/': {
      get: {
        summary: 'Rota raiz',
        description: 'Retorna uma lista de perguntas aleatorias em cache.',
        responses: {
          '200': {
            description: 'Retorna mensagem e lista de perguntas aleatorias',
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
        summary: 'Gerar exercicios para um usuario',
        description: 'Retorna um conjunto de exercicios mistos baseado no nivel do usuario.',
        parameters: [
          {
            name: 'username',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Nome de usuario que identifica o aluno'
          }
        ],
        responses: {
          '200': {
            description: 'Lista de exercicios gerados',
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
            description: 'Parametro username ausente',
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
        summary: 'Listar frases por nivel com paginacao',
        description: 'Retorna todas as frases mapeadas para um nivel especifico, com paginacao para curadoria.',
        parameters: [
          {
            name: 'level',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
            description: 'Nivel de dificuldade das frases'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Numero da pagina (comecando em 1)'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Numero de frases por pagina'
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
            description: 'Parametros invalidos',
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
    '/api/chat': {
      post: {
        tags: ['Chat'],
        summary: 'Chat com tutor de espanhol IA',
        description: 'Conversa com um tutor de espanhol alimentado por IA. O contexto e baseado no progresso do usuario.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Resposta do tutor de IA',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatResponse' }
              }
            }
          },
          '400': {
            description: 'Requisicao invalida',
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
        summary: 'Enviar resultados de exercicios',
        description: 'Recebe as respostas do usuario e atualiza o progresso em memoria.',
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
            description: 'Requisicao invalida',
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
    '/api/exercises/check': {
      post: {
        tags: ['Exercises'],
        summary: 'Validar uma resposta de exercicio sem persistir',
        description: 'Recebe uma resposta de exercicio, valida no servidor e retorna o gabarito sem gravar progresso.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Resultado da validacao da resposta',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CheckResponse' }
              }
            }
          },
          '400': {
            description: 'Requisicao invalida',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Exercicio nao encontrado para o usuario',
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
          correctAnswer: { type: 'string', description: 'Campo interno usado pelo backend para validacoes; nao e retornado no GET /api/exercises' },
          palavra: { type: 'string' }
        },
        required: ['id', 'type', 'question']
      },
      SubmitAnswer: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string' },
          answer: { type: 'string', description: 'Resposta enviada pelo usuario' },
          userAnswer: { type: 'string', description: 'Resposta enviada pelo usuario (alias)' },
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
      CheckAnswer: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string' },
          userAnswer: { type: 'string', description: 'Resposta enviada pelo usuario' },
          answer: { type: 'string', description: 'Alias para resposta enviada pelo usuario' }
        },
        required: ['exerciseId', 'userAnswer']
      },
      CheckRequest: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          answer: { $ref: '#/components/schemas/CheckAnswer' }
        },
        required: ['username', 'answer']
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
      CheckResponse: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string' },
          correctAnswer: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['exerciseId', 'correctAnswer', 'message']
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
      ChatRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Identificador do usuario' },
          message: { type: 'string', description: 'Mensagem do usuario para o tutor' }
        },
        required: ['username', 'message']
      },
      ChatResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string', description: 'Resposta do tutor IA' },
          username: { type: 'string' },
          userLevel: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          error: { type: 'string', description: 'Mensagem de erro (se houver)' }
        },
        required: ['success', 'message', 'username', 'timestamp']
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
