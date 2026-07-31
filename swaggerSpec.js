const swaggerJSDoc = require('swagger-jsdoc')

const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Методы API',
      version: '1.0.0',
      description: 'API документация для приложения'
    },
    servers: [
      {
        url: 'http://localhost:5001',
      },
      {
        url: 'https://server2-cmrh.onrender.com', // Для исправления ошибки на Render, т.к. Swagger на Render пытается отправить запрос на локальный ПК
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization'
        }
      }
    },
    // --- ПРОПИСЫВАЕМ МЕТОДЫ ЗДЕСЬ ---
    paths:{
        '/registration': {
        post: {
          summary: 'Регистрация нового пользователя',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'user@example.com' },
                    password: { type: 'string', example: 'secret123' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Успешная регистрация',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'd3b07384-d113-4956-a5cc-90222a768f7d' },
                      email: { type: 'string', example: 'user@example.com' }
                    }
                  }
                }
              }
            },
            400: { description: 'Невалидный формат JSON' }
          }
        }
      },
      '/login': {
        post: {
          summary: 'Авторизация пользователя',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'user@example.com' },
                    password: { type: 'string', example: 'secret123' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Успешная авторизация, возвращает JWT токен',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                    }
                  }
                }
              }
            },
            401: { description: 'Неверный email или пароль' }
          }
        }
      },
      '/createFile': {
        get: {
          summary: 'Создать файл базы данных',
          tags: ['FS'],
          responses: {
            200: { description: 'Файл успешно создан' }
          }
        }
      },
      '/readFile': {
        get: {
          summary: 'Прочитать весь файл базы данных',
          tags: ['FS'],
          responses: {
            200: { description: 'Данные успешно прочитаны' }
          }
        }
      },
      '/deleteFile': {
        delete: {
          summary: 'Удалить файл базы данных',
          tags: ['FS'],
          responses: {
            200: { description: 'Файл успешно удален' }
          }
        }
      },
      '/getTodo': {
        get: {
          summary: 'Получить список задач текущего пользователя по фильтру',
          tags: ['ToDo'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'completed',
              in: 'query',
              required: true,
              description: 'Фильтр статуса задачи (true или false)',
              schema: { type: 'string', enum: ['true', 'false'] }
            }
          ],
          responses: {
            200: { description: 'Список отфильтрованных задач получен' },
            401: { description: 'Токен истек или невалиден' }
          }
        }
      },
      '/getTodo/{id}': {
        get: {
          summary: 'Получить конкретную задачу по ID',
          tags: ['ToDo'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID задачи',
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Задача успешно найдена' },
            404: { description: 'Задача с указанным ID не найдена' },
            401: { description: 'Токен истек или невалиден' }
          }
        }
      },
      '/createTask': {
        post: {
          summary: 'Создать новую задачу',
          tags: ['ToDo'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', example: 'Купить молоко' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Добавил' },
            401: { description: 'Токен истек или невалиден' },
            500: { description: 'Не удалось сохранить задачу' }
          }
        }
      },
      '/updateTask/{id}': {
        put: {
          summary: 'Изменить название задачи',
          tags: ['ToDo'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID изменяемой задачи',
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', example: 'Новое название задачи' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Название успешно изменено' },
            401: { description: 'Токен истек или невалиден' },
            404: { description: 'Задача с указанным ID не найдена' }
          }
        },
        patch: {
          summary: 'Переключить статус выполнения задачи (done)',
          tags: ['ToDo'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID задачи для инверсии статуса',
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Статус задачи изменен на противоположный' },
            401: { description: 'Токен истек или невалиден' },
            404: { description: 'Задача с указанным ID не найдена' }
          }
        }
      },
      '/deleteTask/{id}': {
        delete: {
          summary: 'Удалить задачу по ID',
          tags: ['ToDo'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID удаляемой задачи',
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Задача успешно удалена, возвращает ID удаленной задачи' },
            401: { description: 'Токен истек или невалиден' },
            404: { description: 'Задача с указанным ID не найдена' }
          }
        }
      }
    },
    schemas: {
        RegisterDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { 
              type: 'string', 
              format: 'email', 
              example: 'user@example.com' 
            },
            password: { 
              type: 'string', 
              minLength: 6, 
              example: 'secret123' 
            }
          }
        },
        LoginDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { 
              type: 'string', 
              format: 'email', 
              example: 'user@example.com' 
            },
            password: { 
              type: 'string', 
              example: 'secret123' 
            }
          }
        },
        CreateTodoDto: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { 
              type: 'string', 
              example: 'Купить продукты' 
            }
          }
        },
        UpdateTodoDto: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { 
              type: 'string', 
              example: 'Обновленный заголовок задачи' 
            }
          }
        }
      }       
  },
  
    apis: [] // Оставляем пустым, так как не ищем комментарии в других файлах
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = swaggerSpec