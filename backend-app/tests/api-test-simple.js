#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Cores ----------
const GREEN = '\x1b[0;32m';
const RED = '\x1b[0;31m';
const YELLOW = '\x1b[1;33m';
const NC = '\x1b[0m';

// ---------- Config ----------
const ENV_FILE = path.join(__dirname, '..', '.env');

function loadApiUrl() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error(`Erro: Arquivo ${ENV_FILE} não encontrado.`);
    process.exit(1);
  }
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const match = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('LOCAL_TEST_URL='));

  if (!match) {
    console.error(`Erro: LOCAL_TEST_URL não definido em ${ENV_FILE}.`);
    process.exit(1);
  }

  let value = match.slice('LOCAL_TEST_URL='.length);
  value = value.replace(/^["']|["']$/g, '').trim();
  return value;
}

const API = loadApiUrl();
console.log(`API configurada para: ${API}`);

let PASS = 0;
let FAIL = 0;
let AUTH_TOKEN = '';

const AUTH_USERNAME = 'teste_dev';
const AUTH_PASSWORD = 'teste_dev';

// ---------- Helpers ----------
function testResult(ok, label) {
  if (ok) {
    console.log(`${GREEN}✓ PASSED${NC} - ${label}`);
    PASS++;
  } else {
    console.log(`${RED}✗ FAILED${NC} - ${label}`);
    FAIL++;
  }
}

// Faz o request e devolve { status, bodyText, bodyJson (ou null) }
async function request(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const bodyText = await res.text();
    let bodyJson = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      // corpo não é JSON, tudo bem
    }
    return { status: res.status, bodyText, bodyJson };
  } catch (err) {
    // Falha de rede: equivalente a curl retornando código != esperado
    return { status: 0, bodyText: '', bodyJson: null, error: err };
  }
}

function authHeader() {
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

async function getAuthToken() {
  const { bodyJson } = await request(`${API}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: AUTH_USERNAME, password: AUTH_PASSWORD }),
  });
  AUTH_TOKEN = bodyJson && bodyJson.token ? bodyJson.token : '';
  return Boolean(AUTH_TOKEN);
}

// ---------- Seleção de teste único ----------
const arg = process.argv[2];
let TARGET_TEST = '';

if (arg !== undefined) {
  if (/^[0-9]+[A-Za-z]?$/.test(arg)) {
    TARGET_TEST = arg;
  } else {
    console.log(`${RED}Usage: node test-simple.js [test_code]${NC}`);
    process.exit(1);
  }
}

function skipTest(code) {
  if (!TARGET_TEST) return false;
  return TARGET_TEST !== code;
}

// ---------- Testes ----------
async function test1() {
  if (skipTest('1')) return;
  console.log('Test 1: Server is running');
  const { status } = await request(`${API}/`);
  testResult(status !== 0, 'GET /');
  console.log('');
}

async function test2() {
  if (skipTest('2')) return;
  console.log('Test 2: POST /api/auth returns token');
  const { status, bodyJson } = await request(`${API}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: AUTH_USERNAME, password: AUTH_PASSWORD }),
  });
  testResult(status === 200, 'HTTP 200');
  if (bodyJson && Object.prototype.hasOwnProperty.call(bodyJson, 'token')) {
    console.log('  ✓ Has token');
  }
  if (bodyJson && Object.prototype.hasOwnProperty.call(bodyJson, 'expiresIn')) {
    console.log('  ✓ Has expiresIn');
  }
  if (bodyJson && bodyJson.token) {
    AUTH_TOKEN = bodyJson.token;
  }
  console.log('');
}

async function test3() {
  if (skipTest('3')) return;
  console.log('Test 3: POST /api/auth without body should return 400');
  const { status } = await request(`${API}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  testResult(status === 400, 'HTTP 400');
  console.log('');
}

async function test4() {
  if (skipTest('4')) return;
  console.log('Test 4: GET /api/exercises without username (username comes inside bearer token)');
  const { status } = await request(`${API}/api/exercises`, { headers: authHeader() });
  testResult(status === 200, 'HTTP 200');
  console.log('');
}

async function test5() {
  if (skipTest('5')) return;
  console.log('Test 5: GET /api/exercises with Bearer token');
  const { status, bodyText } = await request(`${API}/api/exercises?username=test_user1`, {
    headers: authHeader(),
  });
  testResult(status === 200, 'HTTP 200');
  if (bodyText.includes('"id":')) console.log('  ✓ Response has exercises');
  console.log('');
}

async function test6() {
  if (skipTest('6')) return;
  console.log('Test 6: GET /api/exercises/v2 with Bearer token');
  const { status, bodyText } = await request(`${API}/api/exercises/v2`, { headers: authHeader() });
  testResult(status === 200, 'HTTP 200');
  if (bodyText.includes('"id":')) console.log('  ✓ V2 response has exercises');
  console.log('');
}

async function test7() {
  if (skipTest('7')) return;
  console.log('Test 7: POST /api/exercises/submit');
  const { bodyJson: source } = await request(`${API}/api/exercises?username=test_user_submit`, {
    headers: authHeader(),
  });
  const exerciseId =
    source && Array.isArray(source) && source[0] ? source[0].id : source && source.id ? source.id : '';
  const { status } = await request(`${API}/api/exercises/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ answers: [{ exerciseId, answer: 'Hola' }] }),
  });
  testResult(status === 200, 'HTTP 200');
  console.log('');
}

async function test8() {
  if (skipTest('8')) return;
  console.log('Test 8: POST /api/exercises/check');
  const { bodyJson: source } = await request(`${API}/api/exercises?username=test_user_check`, {
    headers: authHeader(),
  });
  const exerciseId =
    source && Array.isArray(source) && source[0] ? source[0].id : source && source.id ? source.id : '';
  const { status } = await request(`${API}/api/exercises/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ answer: { exerciseId, userAnswer: 'Hola' } }),
  });
  testResult(status === 200, 'HTTP 200');
  console.log('');
}

async function test9() {
  if (skipTest('9')) return;
  console.log('Test 9: GET /api/phrases');
  const { status } = await request(`${API}/api/phrases?level=A1&page=1&limit=5`);
  testResult(status === 200, 'HTTP 200');
  console.log('');
}

async function test10() {
  if (skipTest('10')) return;
  console.log('Test 10: POST /api/chat');
  const { status } = await request(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_chat', message: 'Como posso melhorar meu espanhol?' }),
  });
  testResult(status === 200, 'HTTP 200');
  console.log('');
}

async function test11A() {
  if (skipTest('11A')) return;
  console.log('Test 11A: GET /api/progress');
  const { status, bodyText } = await request(`${API}/api/progress`, { headers: authHeader() });
  testResult(status === 200, 'HTTP 200 for /api/progress');

  const fields = [
    'currentLevel',
    'weeklyStreak',
    'levelProgressPercentage',
    'estimatedNextLevelDate',
    'completedLessons',
    'totalLessonsInLevel',
  ];
  for (const field of fields) {
    if (bodyText.includes(`"${field}":`)) console.log(`  ✓ Has ${field}`);
  }
  console.log('');
}

async function test11B() {
  if (skipTest('11B')) return;
  console.log('Test 11B: POST /api/exercises/v2/submit');
  const { status, bodyText } = await request(`${API}/api/exercises/v2/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ lessonNumber: 1 }),
  });
  testResult(status === 200, 'HTTP 200 for /api/exercises/v2/submit');
  if (bodyText.includes('"message":')) console.log('  ✓ Has message');
  console.log('');
}

async function test11C() {
  if (skipTest('11C')) return;
  console.log('Test 11C: GET /api/exercises/v3');
  const { status, bodyText } = await request(`${API}/api/exercises/v3`, { headers: authHeader() });
  testResult(status === 200, 'HTTP 200 for /api/exercises/v3');

  const count = (bodyText.match(/"id":/g) || []).length;
  console.log(`${YELLOW}  Exercises v3 count: ${count} (expected 10)${NC}`);
  if (count === 10) {
    console.log(`  ${GREEN}✓ Correct count${NC}`);
  } else {
    console.log(`  ${RED}✗ Wrong count${NC}`);
  }
  console.log('');
}

// ---------- Execução ----------
async function main() {
  console.clear();

  if (TARGET_TEST) {
    console.log(`${YELLOW}=== Running Test ${TARGET_TEST} ===${NC}\n`);
  } else {
    console.log(`${YELLOW}=== Testing API ===${NC}\n`);
  }

  await test1();
  await test2();
  await test3();

  if (!AUTH_TOKEN) {
    await getAuthToken();
  }

  await test4();
  await test5();
  await test6();
  await test7();
  await test8();
  await test9();
  await test10();
  await test11A();
  await test11B();
  await test11C();

  console.log(`${YELLOW}=== Summary ===${NC}`);
  console.log(`${GREEN}Passed: ${PASS}${NC}`);
  console.log(`${RED}Failed: ${FAIL}${NC}`);

  if (FAIL === 0) {
    console.log(`${GREEN}All tests PASSED!${NC}`);
    process.exit(0);
  } else {
    console.log(`${RED}Some tests FAILED!${NC}`);
    process.exit(1);
  }
}

main();