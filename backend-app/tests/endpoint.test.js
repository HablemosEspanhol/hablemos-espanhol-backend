import request from "supertest";
import { jest } from "@jest/globals";

let app;
let exerciseResponse;

jest.unstable_mockModule("../core/services/UserProgressService.js", () => ({
  default: {
    getOrCreateUser: jest.fn().mockResolvedValue({
      id: 1,
      username: "test",
      nivelAtual: "A1",
      totalAcertos: 0,
      totalErros: 0
    }),

    getUserLevel: jest.fn().mockResolvedValue("A1"),

    storeExercises: jest.fn().mockResolvedValue(),

    checkExerciseAnswer: jest.fn().mockResolvedValue({
      exerciseId: "1",
      correctAnswer: "Hola",
      message: "Resposta correta."
    }),

    updateProgress: jest.fn().mockResolvedValue({
      accuracy: 100,
      newLevel: "A2"
    }),

    getUserChatContext: jest.fn().mockResolvedValue({
      userLevel: "A1",
      recentWords: [],
      totalAcertos: 0,
      totalErros: 0
    }),

    calculateLevelProgression: jest.fn(),
    getPhraseProgress: jest.fn().mockResolvedValue([])
  }
}));

jest.unstable_mockModule("../core/services/ExerciseService.js", () => ({
  default: {
    generateExercises: jest.fn().mockResolvedValue(
      Array.from({ length: 10 }).map((_, i) => ({
        id: `ex-${i}`,
        type: "translate",
        palavra: `palavra-${i}`,
        options: ["Hola", "Adiós", "Gracias"],
        correctAnswer: "Hola" // não será exposto
      }))
    )
  }
}));

beforeAll(async () => {
  const module = await import("../app.js");
  app = module.default;
});

describe("Exercises API", () => {

  test("GET / should return 200", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  });

  test("GET /api/exercises without username → 400", async () => {
    const res = await request(app).get("/api/exercises");
    expect(res.statusCode).toBe(400);
  });

    test("GET /api/exercises with username", async () => {
    const res = await request(app)
      .get("/api/exercises")
      .query({ username: "test_user1" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    expect(res.body.length).toBe(10);

    // salva para próximos testes
    exerciseResponse = res.body;

    // garantir que não expõe resposta
    expect(JSON.stringify(res.body)).not.toContain("correctAnswer");
  });

    test("POST /submit sem body → 400", async () => {
    const res = await request(app)
      .post("/api/exercises/submit")
      .send({});

    expect(res.statusCode).toBe(400);
  });

    test("POST /submit OLD FORMAT", async () => {
    const exerciseId = exerciseResponse[0].id;

    const res = await request(app)
      .post("/api/exercises/submit")
      .send({
        username: "test_user1",
        answers: [
          { exerciseId, correct: true }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accuracy");
    expect(res.body).toHaveProperty("newLevel");
    expect(res.body).toHaveProperty("message");
  });

    test("POST /submit NEW FORMAT", async () => {
    const resGet = await request(app)
      .get("/api/exercises")
      .query({ username: "test_user_new" });

    const exerciseId = resGet.body[0].id;

    const res = await request(app)
      .post("/api/exercises/submit")
      .send({
        username: "test_user_new",
        answers: [
          { exerciseId, answer: "Hola" }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accuracy");
  });

    test("POST /check", async () => {
    const username = "test_user_check";

    const resGet = await request(app)
      .get("/api/exercises")
      .query({ username });

    const exerciseId = resGet.body[0].id;

    const res = await request(app)
      .post("/api/exercises/check")
      .send({
        username,
        answer: {
          exerciseId,
          userAnswer: "Hola"
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("correctAnswer");
  });

    test("GET novamente mantém 10 exercícios", async () => {
    const res = await request(app)
      .get("/api/exercises")
      .query({ username: "test_user1" });

    expect(res.body.length).toBe(10);
  });

    test("POST múltiplas respostas", async () => {
    const resGet = await request(app)
      .get("/api/exercises")
      .query({ username: "test_user2" });

    const ids = resGet.body.slice(0, 5).map(e => e.id);

    const res = await request(app)
      .post("/api/exercises/submit")
      .send({
        username: "test_user2",
        answers: ids.map((id, i) => ({
          exerciseId: id,
          answer: i < 3 ? "correct" : "wrong"
        }))
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accuracy");
  });
})