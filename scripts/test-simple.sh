#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV_FILE="../.env"

if [ -f "$ENV_FILE" ]; then
    # Extrai o valor após o '=' e remove aspas extras se houver
    API=$(grep -E '^LOCAL_TEST_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
else
    echo "Erro: Arquivo $ENV_FILE não encontrado."
    exit 1
fi

echo "API configurada para: $API"

PASS=0
FAIL=0
TARGET_TEST=""

AUTH_USERNAME="teste_dev"
AUTH_PASSWORD="teste_dev"
AUTH_TOKEN=""

clear

if [ $# -eq 1 ] && [[ "$1" =~ ^[0-9]+[A-Za-z]?$ ]]; then
  TARGET_TEST="$1"
  echo -e "${YELLOW}=== Running Test $TARGET_TEST ===${NC}\n"
else
  if [ $# -ne 0 ]; then
    echo -e "${RED}Usage: ./test-simple.sh [test_code]${NC}"
    exit 1
  fi
  echo -e "${YELLOW}=== Testing API ===${NC}\n"
fi

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC} - $2"
    ((PASS++))
  else
    echo -e "${RED}✗ FAILED${NC} - $2"
    ((FAIL++))
  fi
}

skip_test() {
  if [ -z "$TARGET_TEST" ]; then
    return 1
  fi
  if [[ "$TARGET_TEST" == "$1" ]]; then
    return 1
  fi
  return 0
}

get_auth_token() {
  local response
  response=$(curl -s -X POST "$API/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AUTH_USERNAME\",\"password\":\"$AUTH_PASSWORD\"}")

  AUTH_TOKEN=$(echo "$response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  [ -n "$AUTH_TOKEN" ]
}

if ! skip_test 1; then
  echo "Test 1: Server is running"
  curl -s "$API/" > /dev/null 2>&1
  test_result $? "GET /"
  echo ""
fi

if ! skip_test 2; then
  echo "Test 2: POST /api/auth returns token"
  AUTH_RESPONSE_FILE=$(mktemp)
  HTTP_CODE=$(curl -s -o "$AUTH_RESPONSE_FILE" -w "%{http_code}" -X POST "$API/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AUTH_USERNAME\",\"password\":\"$AUTH_PASSWORD\"}")
  AUTH_RESPONSE=$(cat "$AUTH_RESPONSE_FILE")
  rm -f "$AUTH_RESPONSE_FILE"
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo "$AUTH_RESPONSE" | grep -q '"token":' && echo "  ✓ Has token"
  echo "$AUTH_RESPONSE" | grep -q '"expiresIn":' && echo "  ✓ Has expiresIn"
  AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  echo ""
fi

if ! skip_test 3; then
  echo "Test 3: POST /api/auth without body should return 400"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/auth" \
    -H "Content-Type: application/json" -d '{}')
  [ "$HTTP_CODE" = "400" ]
  test_result $? "HTTP 400"
  echo ""
fi

if [ -z "$AUTH_TOKEN" ]; then
  get_auth_token
fi

if ! skip_test 4; then
  echo "Test 4: GET /api/exercises without username (username comes inside bearer token)"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo ""
fi

if ! skip_test 5; then
  echo "Test 5: GET /api/exercises with Bearer token"
  RESPONSE=$(curl -s "$API/api/exercises?username=test_user1" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises?username=test_user1" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo "$RESPONSE" | grep -q '"id":' && echo "  ✓ Response has exercises"
  echo ""
fi

if ! skip_test 6; then
  echo "Test 6: GET /api/exercises/v2 with Bearer token"
  # Faz a única requisição com a URL, o token e anexa o código HTTP na última linha
  RESPONSE_FULL=$(curl -s "$API/api/exercises/v2" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -w "\n%{http_code}")

  # Separa o código HTTP (última linha) do corpo do JSON (demais linhas)
  HTTP_CODE=$(echo "$RESPONSE_FULL" | tail -n1)
  RESPONSE_V2=$(echo "$RESPONSE_FULL" | sed '$d')
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo "$RESPONSE_V2" | grep -q '"id":' && echo "  ✓ V2 response has exercises"
  echo ""
fi

if ! skip_test 7; then
  echo "Test 7: POST /api/exercises/submit"
  RESPONSE_SOURCE=$(curl -s "$API/api/exercises?username=test_user_submit" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  EXERCISE_ID=$(echo "$RESPONSE_SOURCE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  SUBMIT_DATA="{\"username\":\"test_user_submit\",\"answers\":[{\"exerciseId\":\"$EXERCISE_ID\",\"answer\":\"Hola\"}]}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$SUBMIT_DATA")
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo ""
fi

if ! skip_test 8; then
  echo "Test 8: POST /api/exercises/check"
  RESPONSE_SOURCE=$(curl -s "$API/api/exercises?username=test_user_check" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  EXERCISE_ID=$(echo "$RESPONSE_SOURCE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  CHECK_DATA="{\"username\":\"test_user_check\",\"answer\":{\"exerciseId\":\"$EXERCISE_ID\",\"userAnswer\":\"Hola\"}}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/check" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$CHECK_DATA")
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo ""
fi

if ! skip_test 9; then
  echo "Test 9: GET /api/phrases"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?level=A1&page=1&limit=5")
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo ""
fi

if ! skip_test 10; then
  echo "Test 10: POST /api/chat"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"username":"test_chat","message":"Como posso melhorar meu espanhol?"}')
  [ "$HTTP_CODE" = "200" ]
  test_result $? "HTTP 200"
  echo ""
fi

# Test 11A: GET /api/progress
if ! skip_test 11A; then
echo "Test 11A: GET /api/progress"
RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" -w "\n%{http_code}" "$API/api/progress")
HTTP_CODE_PROGRESS=$(echo "$RESPONSE" | tail -n1)
PROGRESS_RESPONSE=$(echo "$RESPONSE" | sed '$d')

[ "$HTTP_CODE_PROGRESS" = "200" ]
test_result $? "HTTP 200 for /api/progress"

echo "$PROGRESS_RESPONSE" | grep -q '"currentLevel":' && echo "  ✓ Has currentLevel"
echo "$PROGRESS_RESPONSE" | grep -q '"weeklyStreak":' && echo "  ✓ Has weeklyStreak"
echo "$PROGRESS_RESPONSE" | grep -q '"levelProgressPercentage":' && echo "  ✓ Has levelProgressPercentage"
echo "$PROGRESS_RESPONSE" | grep -q '"estimatedNextLevelDate":' && echo "  ✓ Has estimatedNextLevelDate"
echo "$PROGRESS_RESPONSE" | grep -q '"completedLessons":' && echo "  ✓ Has completedLessons"
echo "$PROGRESS_RESPONSE" | grep -q '"totalLessonsInLevel":' && echo "  ✓ Has totalLessonsInLevel"
echo ""
fi

# Test 11B: POST /api/exercises/v2/submit
if ! skip_test 11B; then
echo "Test 11B: POST /api/exercises/v2/submit"
LESSON_SUBMIT_DATA='{"lessonNumber":1}'

# Faz a única requisição POST com os headers e captura resposta + status
RESPONSE=$(curl -s -X POST "$API/api/exercises/v2/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$LESSON_SUBMIT_DATA" \
  -w "\n%{http_code}")

# Separa o código HTTP e o JSON da resposta
HTTP_CODE_LESSON_SUBMIT=$(echo "$RESPONSE" | tail -n1)
LESSON_SUBMIT_RESPONSE=$(echo "$RESPONSE" | sed '$d')

[ "$HTTP_CODE_LESSON_SUBMIT" = "200" ]
test_result $? "HTTP 200 for /api/exercises/v2/submit"

echo "$LESSON_SUBMIT_RESPONSE" | grep -q '"message":' && echo "  ✓ Has message"
echo ""
fi

# Test 11C: GET /api/exercises/v3
if ! skip_test 11C; then
echo "Test 11C: GET /api/exercises/v3"
# Faz a única requisição GET com o token Bearer e concatena o código HTTP ao final
RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" -w "\n%{http_code}" "$API/api/exercises/v3")

# Extrai o código de status HTTP (última linha) e o corpo da resposta (demais linhas)
HTTP_CODE_EX_V3=$(echo "$RESPONSE" | tail -n1)
EXERCISES_V3_RESPONSE=$(echo "$RESPONSE" | sed '$d')

[ "$HTTP_CODE_EX_V3" = "200" ]
test_result $? "HTTP 200 for /api/exercises/v3"

COUNT_V3=$(echo "$EXERCISES_V3_RESPONSE" | grep -o '"id":' | wc -l)
echo -e "${YELLOW}  Exercises v3 count: $COUNT_V3 (expected 10)${NC}"
[ "$COUNT_V3" = "10" ] && echo -e "  ${GREEN}✓ Correct count${NC}" || echo -e "  ${RED}✗ Wrong count${NC}"
echo ""
fi



echo -e "${YELLOW}=== Summary ===${NC}"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}All tests PASSED!${NC}"
  exit 0
else
  echo -e "${RED}Some tests FAILED!${NC}"
  exit 1
fi
