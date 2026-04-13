#!/usr/bin/env node

const API = "http://192.168.15.11:3000";

const GREEN = "\x1b[0;32m";
const RED = "\x1b[0;31m";
const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

let PASS = 0;
let FAIL = 0;

// ------------------ HELPERS ------------------

function testResult(success, msg) {
  if (success) {
    console.log(`${GREEN}✓ PASSED${NC} - ${msg}`);
    PASS++;
  } else {
    console.log(`${RED}✗ FAILED${NC} - ${msg}`);
    FAIL++;
  }
}

async function httpGet(path) {
  const res = await fetch(API + path);
  const text = await res.text();
  return { status: res.status, body: text };
}

async function httpPost(path, data) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const text = await res.text();
  return { status: res.status, body: text };
}

// ------------------ TESTS ------------------

(async () => {

console.log(`${YELLOW}=== Testing Exercises API ===${NC}\n`);

let RESPONSE = "";

// Test 1
console.log("Test 1: Server is running");
try {
  const res = await httpGet("/");
  testResult(res.status === 200, "GET /");
} catch {
  testResult(false, "GET /");
}
console.log("");

// Test 2
console.log("Test 2: GET /api/exercises without username (should return 400)");
{
  const res = await httpGet("/api/exercises");
  testResult(res.status === 400, "HTTP 400");
}
console.log("");

// Test 3
console.log("Test 3: GET /api/exercises with username");
{
  const res = await httpGet("/api/exercises?username=test_user1");
  RESPONSE = res.body;

  testResult(res.status === 200, "HTTP 200");

  if (RESPONSE.includes('"id":')) console.log("  ✓ Response has exercises");
  if (RESPONSE.includes('"type":')) console.log("  ✓ Response has type field");

  if (RESPONSE.includes('"correctAnswer":')) {
    console.log(`  ${RED}✗ Response should NOT contain correctAnswer${NC}`);
  } else {
    console.log(`  ${GREEN}✓ correctAnswer is NOT exposed${NC}`);
  }

  const count = (RESPONSE.match(/"id":/g) || []).length;
  console.log(`${YELLOW}  Exercises count: ${count} (expected 10)${NC}`);

  if (count === 10) console.log(`  ${GREEN}✓ Correct count${NC}`);
  else console.log(`  ${RED}✗ Wrong count${NC}`);
}
console.log("");

// Test 4
console.log("Test 4: POST /api/exercises/submit without required fields");
{
  const res = await httpPost("/api/exercises/submit", {});
  testResult(res.status === 400, "HTTP 400");
}
console.log("");

// Test 5
console.log("Test 5: POST /api/exercises/submit - OLD FORMAT (with correct flag)");
{
  const match = RESPONSE.match(/"id":"([^"]*)"/);
  const id = match?.[1];

  console.log(`  Using exercise ID: ${id}`);

  const res = await httpPost("/api/exercises/submit", {
    username: "test_user1",
    answers: [{ exerciseId: id, correct: true }],
  });

  testResult(res.status === 200, "HTTP 200");

  console.log("  Response:", res.body);

  if (res.body.includes('"accuracy":')) console.log("  ✓ Has accuracy");
  if (res.body.includes('"newLevel":')) console.log("  ✓ Has newLevel");
  if (res.body.includes('"message":')) console.log("  ✓ Has message");
}
console.log("");

// Test 5B
console.log("Test 5B: POST /api/exercises/submit - NEW FORMAT (with answer/userAnswer)");
{
  const match = RESPONSE.match(/"id":"([^"]*)"/);
  const id = match?.[1];

  console.log(`  Using exercise ID: ${id}`);

  const res = await httpPost("/api/exercises/submit", {
    username: "test_user1",
    answers: [{ exerciseId: id, answer: "test" }],
  });

  testResult(res.status === 200, "HTTP 200 (NEW FORMAT)");

  console.log("  Response:", res.body);

  if (res.body.includes('"accuracy":')) console.log("  ✓ Has accuracy");
  if (res.body.includes('"newLevel":')) console.log("  ✓ Has newLevel");
  if (res.body.includes('"message":')) console.log("  ✓ Has message");
}
console.log("");

// Test 5C
console.log("Test 5C: POST /api/exercises/check");
{
  const match = RESPONSE.match(/"id":"([^"]*)"/);
  const id = match?.[1];

  console.log(`  Using exercise ID: ${id}`);

  const res = await httpPost("/api/exercises/check", {
    exerciseId: id,
    answer: "wrong"
  });

  testResult(res.status === 200, "HTTP 200 for /api/exercises/check");

  console.log("  Response:", res.body);

  if (res.body.includes(`"exerciseId":"${id}"`)) console.log("  ✓ Has correct exerciseId");
  if (res.body.includes('"correctAnswer":')) console.log("  ✓ Has correctAnswer");
  if (res.body.includes('"message":')) console.log("  ✓ Has message");
}
console.log("");

// Test 5D
console.log("Test 5D: POST /api/exercises/check without required fields (should return 400)");
{
  const res = await httpPost("/api/exercises/check", {});
  testResult(res.status === 400, "HTTP 400 for invalid /api/exercises/check body");
}
console.log("");

// Test 5E
console.log("Test 5E: POST /api/exercises/check with unknown exerciseId (should return 404)");
{
  const res = await httpPost("/api/exercises/check", {
    exerciseId: "unknown_id",
    answer: "test"
  });
  testResult(res.status === 404, "HTTP 404 for unknown exerciseId in /api/exercises/check");
}
console.log("");

// Test 6
console.log("Test 6: Get exercises for same user (verify persistence)");
{
  const res = await fetch(`${API}/api/exercises?username=test_user1`);
  const body = await res.json();

  const count = Array.isArray(body) ? body.length : 0;
  console.log(`  Exercises count: ${count} (expected 10)`);

  testResult(count === 10, "Array size correct");
}
console.log("");

// Test 7
console.log("Test 7: POST with multiple answers (mixed) - NEW FORMAT");
{
  const resGet = await fetch(`${API}/api/exercises?username=test_user2`);
  const exercises = await resGet.json();

  const ids = exercises.slice(0, 5).map(e => e.id);

  const payload = {
    username: "test_user2",
    answers: [
      { exerciseId: ids[0], answer: "correct1" },
      { exerciseId: ids[1], answer: "correct2" },
      { exerciseId: ids[2], answer: "correct3" },
      { exerciseId: ids[3], answer: "wrong1" },
      { exerciseId: ids[4], answer: "wrong2" }
    ]
  };

  const resPost = await fetch(`${API}/api/exercises/submit`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  const text = await resPost.text();

  testResult(resPost.status === 200, "HTTP 200 for mixed answers");

  console.log("  Response:", text);

  if (text.includes('"accuracy":')) console.log("  ✓ Has accuracy field");
  else console.log("  ✗ Missing accuracy field");

  if (text.includes('"newLevel":')) console.log("  ✓ Has newLevel field");
  else console.log("  ✗ Missing newLevel field");
}
console.log("");

// Test 8
console.log("Test 8: GET /api/phrases with level and pagination");
{
  const res = await fetch(`${API}/api/phrases?level=A1&page=1&limit=5`);
  const text = await res.text();

  testResult(res.status === 200, "HTTP 200 for phrases endpoint");

  if (text.includes('"level":"A1"')) console.log("  ✓ Has correct level");
  if (text.includes('"page":1')) console.log("  ✓ Has correct page");
  if (text.includes('"limit":5')) console.log("  ✓ Has correct limit");
  if (text.includes('"total":')) console.log("  ✓ Has total count");
  if (text.includes('"totalPages":')) console.log("  ✓ Has totalPages");
  if (text.includes('"data":[')) console.log("  ✓ Has data array");

  const count = (text.match(/"id":/g) || []).length;
  console.log(`  Phrases returned: ${count} (expected 5 or less)`);

  if (count <= 5) console.log("  ✓ Correct or fewer items");
  else console.log("  ✗ Too many items");
}
console.log("");

// Test 8B
console.log("Test 8B: GET /api/phrases without level (should fail)");
{
  const res = await fetch(`${API}/api/phrases`);
  testResult(res.status === 400, "HTTP 400 without level parameter");
}
console.log("");

// Test 8C
console.log("Test 8C: GET /api/phrases with invalid limit");
{
  const res = await fetch(`${API}/api/phrases?level=A1&limit=999`);
  testResult(res.status === 400, "HTTP 400 with limit > 100");
}
console.log("");

// Test 9
console.log("Test 9: POST /api/chat - Chat com tutor de espanhol");
{
  const payload = {
    username: "test_chat",
    message: "Como posso melhorar meu espanhol?"
  };

  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  const text = await res.text();

  testResult(res.status === 200, "HTTP 200 for chat endpoint");

  if (text.includes('"message":')) console.log("  ✓ Has message from tutor");
  if (text.includes('"username":"test_chat"')) console.log("  ✓ Has correct username");
  if (text.includes('"timestamp":')) console.log("  ✓ Has timestamp");

  const preview = text.slice(0, 80).replace(/\n/g, " ");
  console.log(`  Tutor response: ${preview} ...`);
}
console.log("");

// Test 9B
console.log("Test 9B: POST /api/chat without message (should return 400)");
{
  const res = await httpPost("/api/chat", { username: "test_chat" });
  testResult(res.status === 400, "HTTP 400 when message missing");
}
console.log("");

// Test 10
console.log("Test 10: Smart repetition (score-based prioritization)");
{
  const username = `test_srs_user_${Date.now()}_${Math.floor(Math.random()*10000)}`;

  console.log(`\n  PASSO 1: Fetching initial exercises for ${username}`);

  const res1 = await fetch(`${API}/api/exercises?username=${username}`);
  const exercises = await res1.json();

  testResult(res1.status === 200, "HTTP 200 for initial fetch");

  const [a, b, c] = exercises;

  console.log("  ✓ Captured Exercises:");
  console.log(`    - Exercise A (target for high score): ${a.id} | word: ${a.word}`);
  console.log(`    - Exercise B (medium score):         ${b.id} | word: ${b.word}`);
  console.log(`    - Exercise C (no repetition needed): ${c.id} | word: ${c.word}`);

  console.log("\n  PASSO 2: Building exercise history (simulating user performance)");

  console.log("    - Submitting Exercise A (3x wrong) to build high score...");
  for (let i = 0; i < 3; i++) {
    await httpPost("/api/exercises/submit", {
      username,
      answers: [{ exerciseId: a.id, answer: "wrong" }]
    });
  }
  console.log("    ✓ Exercise A submitted 3x (wrong) - Expected score: (3*2) + seg_sem_ver");

  console.log("    - Submitting Exercise B (1x wrong) to build medium score...");
  await httpPost("/api/exercises/submit", {
    username,
    answers: [{ exerciseId: b.id, answer: "wrong" }]
  });
  console.log("    ✓ Exercise B submitted 1x (wrong) - Expected score: (1*2) + seg_sem_ver");

  console.log("    - Submitting Exercise C (1x correct) - should NOT be prioritized...");
  await httpPost("/api/exercises/submit", {
    username,
    answers: [{ exerciseId: c.id, answer: "correct" }]
  });
  console.log("    ✓ Exercise C submitted 1x (correct)");

  console.log("\n  PASSO 3: Fetching new exercises (should prioritize by score)");

  const res2 = await fetch(`${API}/api/exercises?username=${username}`);
  const newList = await res2.json();

  testResult(res2.status === 200, "HTTP 200 for second fetch");

  console.log("\n  PASSO 4: Validating smart repetition (score-based prioritization)");

  const top5 = newList.slice(0, 5);

  if (newList.some(e => e.id === a.id)) {
    console.log("    ✓ Exercise A id (highest score) FOUND in new list");
    testResult(true, "Smart repetition validation PASSED");
  } else {
    console.log("    ✗ Exercise A id NOT found");
    testResult(false, "Smart repetition FAILED");
  }

  if (top5.some(e => e.id === a.id)) {
    console.log("    ✓ Exercise A id appears in prioritized positions (top 5)");
  }

  if (newList.some(e => e.id === b.id)) {
    console.log("    ✓ Exercise B id (medium score) FOUND in new list");
  }

  if (newList.some(e => e.id === c.id)) {
    console.log("    ⚠ Exercise C id (already correct) found - may be filtered by internal logic");
  } else {
    console.log("    ✓ Exercise C id (correct answer) correctly filtered out");
  }
}

console.log("\n=== Summary ===");
console.log(`Passed: ${PASS}`);
console.log(`Failed: ${FAIL}`);

if (FAIL === 0) {
  console.log("All tests PASSED!");
  process.exit(0);
} else {
  console.log("Some tests FAILED!");
  process.exit(1);
}

})();