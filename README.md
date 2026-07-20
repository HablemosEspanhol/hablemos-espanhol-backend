# Hablemos Espanhol Backend API

API desenvolvida para geração de exercícios de espanhol, submissão de resultados, gerenciamento de frases para curadoria e suporte a conversação com um tutor de Inteligência Artificial, além de acompanhar o progresso dos alunos.

---

## 🚀 Funcionalidades

### 🧩 Geração e Execução de Exercícios
* **Geração Dinâmica:** Criação de um conjunto de exercícios mistos adaptados dinamicamente com base no nível atual do aluno (`/api/exercises`). Os tipos de exercícios suportados são:
  * Tradução (`translation`)
  * Preenchimento de lacunas (`fill_blank`)
  * Múltipla escolha (`multiple_choice`)
* **Lógica de Negócio (Geração):** _[Inserir aqui detalhes sobre como o backend seleciona ou monta a combinação de exercícios com base no nível do aluno]_
* **Validação Rápida (Gabarito):** Permite validar uma resposta isolada de forma imediata (`/api/exercises/check`), retornando o gabarito oficial (`correctAnswer`) sem aplicar persistência ou alterar o score do usuário.

### 📈 Acompanhamento de Progresso e Submissão
* **Submissão em Lote:** Envio de um conjunto de respostas do aluno (`/api/exercises/submit`) para computação de desempenho.
* **Métricas de Retorno:** Retorna a porcentagem de acertos (`accuracy`), uma mensagem customizada e o novo nível do usuário (`newLevel`).
* **Lógica de Negócio (Evolução de Nível):** _[Inserir aqui os critérios, regras de pontuação ou acertos necessários para que um usuário suba ou desça de nível]_

### 🤖 Tutor de Inteligência Artificial (Chat)
* **Atendimento Personalizado:** Endpoint de chat interativo (`/api/chat`) com um tutor de espanhol automatizado por IA.
* **Contextualização:** A IA utiliza o progresso e o nível atual do usuário para ajustar o vocabulário e a complexidade das interações.
* **Lógica de Negócio (Prompt/IA):** _[Inserir aqui informações sobre o modelo de linguagem utilizado, engenharia de prompt ou persistência do histórico do chat]_

### 📚 Banco de Frases e Curadoria
* **Listagem Segmentada:** Endpoint voltado para consulta e curadoria de frases cadastradas por níveis oficiais de proficiência do Quadro Europeu Comum de Referência (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`).
* **Paginação:** Suporte a paginação nativa via parâmetros `page` e `limit` para otimização de leitura.

### ⚡ Rota Raiz (Cache)
* Retorna uma lista rápida de perguntas aleatórias armazenadas previamente em cache (`/`), contendo estruturas simples no formato de chaves `front` e `back`.
* **Lógica de Negócio (Cache):** _[Inserir aqui a origem dessas perguntas e a frequência/critério com que o cache é atualizado]_

---

## 🛠️ Stack Tecnológica & Infraestrutura

A infraestrutura da aplicação é totalmente conteinerizada usando Docker e é composta pelos seguintes serviços:

* **Database:** MySQL 8.0 (Persistência de dados de usuários, níveis e histórico).
* **AI Engine (Opcional/Preparado):** Suporte estruturado para Ollama (com a imagem do modelo `phi3`).
* **Volumes de Persistência:**
  * `mysql_data`: Dados do banco de dados relacional.
  * `ollama`: Modelos locais de IA armazenados em cache.
  * `app_data`: Arquivos ou dados locais utilizados pela aplicação backend.

---

## 📦 Como Executar o Projeto

### Pré-requisitos
* [Docker](https://www.docker.com/) instalado.
* [Docker Compose](https://docs.docker.com/compose/) instalado.

### Configuração de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis de ambiente:

```env
PORT=3000
DB_PORT=3306
DB_HOST=mysql
DB_NAME=hablemos_espanhol
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
MYSQL_ROOT_PASSWORD=sua_senha_root
MYSQL_DATABASE=hablemos_espanhol
MYSQL_USER=seu_usuario
MYSQL_PASSWORD=sua_senha