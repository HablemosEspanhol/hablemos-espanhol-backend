#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# API="http://localhost:3000"
API="http://192.168.15.11:3002"
PASS=0
FAIL=0
TARGET_TEST=""

# Parse command line arguments
if [ $# -eq 1 ] && [[ "$1" =~ ^[0-9]+[A-Za-z]?$ ]]; then
  TARGET_TEST="$1"
  echo -e "${YELLOW}=== Running Test $TARGET_TEST ===${NC}\n"
else
  if [ $# -ne 0 ]; then
    echo -e "${RED}Usage: ./test-simple.sh [test_code]${NC}"
    echo "  Example: ./test-simple.sh 10   (runs only Test 10)"
    echo "  Example: ./test-simple.sh 5B   (runs only Test 5B)"
    echo "  Example: ./test-simple.sh      (runs all tests)"
    exit 1
  fi
  echo -e "${YELLOW}=== Testing Exercises API ===${NC}\n"
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

  if [[ "$1" =~ ^[0-9]+[A-Z]$ ]]; then
    local base=${1%?}
    if [ "$TARGET_TEST" = "$1" ] || [ "$TARGET_TEST" = "$base" ]; then
      return 1
    fi
  else
    if [ "$TARGET_TEST" = "$1" ]; then
      return 1
    fi
    if [[ "$TARGET_TEST" =~ ^${1}[A-Z]$ ]]; then
      return 0
    fi
  fi
  return 0
}

# Test 1: Server running
if ! skip_test 1; then
echo "Test 1: Server is running"
curl -s "$API/" > /dev/null 2>&1
test_result $? "GET /"
echo ""
fi

# Test 2: GET without username
if ! skip_test 2; then
echo "Test 2: GET /api/exercises without username (should return 400)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400"
echo ""
fi

# Test 3: GET with username
if ! skip_test 3; then
echo "Test 3: GET /api/exercises with username"
RESPONSE=$(curl -s "$API/api/exercises?username=test_user1")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises?username=test_user1")
[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200"

echo "$RESPONSE" | grep -q '"id":' && echo "  ✓ Response has exercises"
echo "$RESPONSE" | grep -q '"type":' && echo "  ✓ Response has type field"

if echo "$RESPONSE" | grep -q '"correctAnswer":'; then
  echo -e "  ${RED}✗ Response should NOT contain correctAnswer${NC}"
else
  echo -e "  ${GREEN}✓ correctAnswer is NOT exposed${NC}"
fi

COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
echo -e "${YELLOW}  Exercises count: $COUNT (expected 10)${NC}"
[ "$COUNT" = "10" ] && echo -e "  ${GREEN}✓ Correct count${NC}" || echo -e "  ${RED}✗ Wrong count${NC}"
echo ""
fi

# Test 4: POST without body
if ! skip_test 4; then
echo "Test 4: POST /api/exercises/submit without required fields"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" -d '{}')
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400"
echo ""
fi

# Test 5: OLD FORMAT
if ! skip_test 5; then
echo "Test 5: POST /api/exercises/submit - OLD FORMAT (with correct flag)"
EXERCISE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Using exercise ID: $EXERCISE_ID"

SUBMIT_DATA="{\"username\": \"test_user1\", \"answers\": [{\"exerciseId\": \"$EXERCISE_ID\", \"correct\": true}]}"
SUBMIT_RESPONSE=$(curl -s -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$SUBMIT_DATA")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$SUBMIT_DATA")

[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200"

echo "  Response: $SUBMIT_RESPONSE"
echo "$SUBMIT_RESPONSE" | grep -q '"accuracy":' && echo "  ✓ Has accuracy"
echo "$SUBMIT_RESPONSE" | grep -q '"newLevel":' && echo "  ✓ Has newLevel"
echo "$SUBMIT_RESPONSE" | grep -q '"message":' && echo "  ✓ Has message"
echo "$SUBMIT_RESPONSE" | grep -q '"accuracy":100' && echo "  ✓ Accuracy is 100%"
echo ""
fi

# Test 5B: NEW FORMAT
if ! skip_test 5B; then
echo "Test 5B: POST /api/exercises/submit - NEW FORMAT (with answer/userAnswer)"
RESPONSE_NEW=$(curl -s "$API/api/exercises?username=test_user_new")
EXERCISE_ID_NEW=$(echo "$RESPONSE_NEW" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Using exercise ID: $EXERCISE_ID_NEW"

SUBMIT_DATA_NEW="{\"username\": \"test_user_new\", \"answers\": [{\"exerciseId\": \"$EXERCISE_ID_NEW\", \"answer\": \"Hola\"}]}"
SUBMIT_RESPONSE_NEW=$(curl -s -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$SUBMIT_DATA_NEW")
HTTP_CODE_NEW=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$SUBMIT_DATA_NEW")

[ "$HTTP_CODE_NEW" = "200" ]
test_result $? "HTTP 200 (NEW FORMAT)"

echo "  Response: $SUBMIT_RESPONSE_NEW"
echo "$SUBMIT_RESPONSE_NEW" | grep -q '"accuracy":' && echo "  ✓ Has accuracy"
echo "$SUBMIT_RESPONSE_NEW" | grep -q '"newLevel":' && echo "  ✓ Has newLevel"
echo "$SUBMIT_RESPONSE_NEW" | grep -q '"message":' && echo "  ✓ Has message"
echo ""
fi

# Test 5C: Check single answer without persistence
if ! skip_test 5C; then
echo "Test 5C: POST /api/exercises/check"
CHECK_USERNAME="test_user_check"
CHECK_RESPONSE_SOURCE=$(curl -s "$API/api/exercises?username=$CHECK_USERNAME")
CHECK_EXERCISE_ID=$(echo "$CHECK_RESPONSE_SOURCE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Using exercise ID: $CHECK_EXERCISE_ID"

CHECK_DATA="{\"username\": \"$CHECK_USERNAME\", \"answer\": {\"exerciseId\": \"$CHECK_EXERCISE_ID\", \"userAnswer\": \"Hola\"}}"
CHECK_RESPONSE=$(curl -s -X POST "$API/api/exercises/check" \
  -H "Content-Type: application/json" \
  -d "$CHECK_DATA")
HTTP_CODE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/check" \
  -H "Content-Type: application/json" \
  -d "$CHECK_DATA")

[ "$HTTP_CODE_CHECK" = "200" ]
test_result $? "HTTP 200 for /api/exercises/check"

echo "  Response: $CHECK_RESPONSE"
echo "$CHECK_RESPONSE" | grep -q "\"exerciseId\":\"$CHECK_EXERCISE_ID\"" && echo "  ✓ Has correct exerciseId"
echo "$CHECK_RESPONSE" | grep -q '"correctAnswer":' && echo "  ✓ Has correctAnswer"
echo "$CHECK_RESPONSE" | grep -q '"message":' && echo "  ✓ Has message"
echo ""
fi

# Test 5D: Check endpoint invalid payload
if ! skip_test 5D; then
echo "Test 5D: POST /api/exercises/check without required fields (should return 400)"
HTTP_CODE_CHECK_INVALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/check" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user_check", "answer": {"exerciseId": ""}}')
[ "$HTTP_CODE_CHECK_INVALID" = "400" ]
test_result $? "HTTP 400 for invalid /api/exercises/check body (returned $HTTP_CODE_CHECK_INVALID)"
echo ""
fi

# Test 5E: Check endpoint unknown exercise
if ! skip_test 5E; then
echo "Test 5E: POST /api/exercises/check with unknown exerciseId (should return 404)"
HTTP_CODE_CHECK_NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/check" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user_check", "answer": {"exerciseId": "non-existent-id", "userAnswer": "Hola"}}')
[ "$HTTP_CODE_CHECK_NOT_FOUND" = "404" ]
test_result $? "HTTP 404 for unknown exerciseId in /api/exercises/check (returned $HTTP_CODE_CHECK_NOT_FOUND)"
echo ""
fi

# Test 6: Get exercises for same user
if ! skip_test 6; then
echo "Test 6: Get exercises for same user (verify persistence)"
RESPONSE2=$(curl -s "$API/api/exercises?username=test_user1")
COUNT2=$(echo "$RESPONSE2" | grep -o '"id":' | wc -l)
echo "  Exercises count: $COUNT2 (expected 10)"
[ "$COUNT2" = "10" ]
test_result $? "Array size correct"
echo ""
fi

# Test 7: Multiple answers
if ! skip_test 7; then
echo "Test 7: POST with multiple answers (mixed) - NEW FORMAT"
RESPONSE3=$(curl -s "$API/api/exercises?username=test_user2")
ID1=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
ID2=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
ID3=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
ID4=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '4p' | cut -d'"' -f4)
ID5=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '5p' | cut -d'"' -f4)

MIXED_DATA="{\"username\": \"test_user2\", \"answers\": [{\"exerciseId\": \"$ID1\", \"answer\": \"correct1\"},{\"exerciseId\": \"$ID2\", \"answer\": \"correct2\"},{\"exerciseId\": \"$ID3\", \"answer\": \"correct3\"},{\"exerciseId\": \"$ID4\", \"answer\": \"wrong1\"},{\"exerciseId\": \"$ID5\", \"answer\": \"wrong2\"}]}"
MIXED_RESPONSE=$(curl -s -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$MIXED_DATA")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$MIXED_DATA")

[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200 for mixed answers"

echo "  Response: $MIXED_RESPONSE"
echo "$MIXED_RESPONSE" | grep -q '"accuracy":' && echo "  ✓ Has accuracy field" || echo "  ✗ Missing accuracy field"
echo "$MIXED_RESPONSE" | grep -q '"newLevel":' && echo "  ✓ Has newLevel field" || echo "  ✗ Missing newLevel field"
echo ""
fi

# Test 8: GET /api/phrases
if ! skip_test 8; then
echo "Test 8: GET /api/phrases with level and pagination"
PHRASES_RESPONSE=$(curl -s "$API/api/phrases?level=A1&page=1&limit=5")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?level=A1&page=1&limit=5")

[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200 for phrases endpoint"

echo "$PHRASES_RESPONSE" | grep -q '"level":"A1"' && echo "  ✓ Has correct level"
echo "$PHRASES_RESPONSE" | grep -q '"page":1' && echo "  ✓ Has correct page"
echo "$PHRASES_RESPONSE" | grep -q '"limit":5' && echo "  ✓ Has correct limit"
echo "$PHRASES_RESPONSE" | grep -q '"total":' && echo "  ✓ Has total count"
echo "$PHRASES_RESPONSE" | grep -q '"totalPages":' && echo "  ✓ Has totalPages"
echo "$PHRASES_RESPONSE" | grep -q '"data":\[' && echo "  ✓ Has data array"

DATA_COUNT=$(echo "$PHRASES_RESPONSE" | grep -o '"id":' | wc -l)
echo "  Phrases returned: $DATA_COUNT (expected 5 or less)"
[ "$DATA_COUNT" -le 5 ] && echo -e "  ${GREEN}✓ Correct or fewer items${NC}" || echo -e "  ${RED}✗ Too many items${NC}"

echo "Test 8B: GET /api/phrases without level (should fail)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?page=1&limit=5")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 without level parameter"

echo "Test 8C: GET /api/phrases with invalid limit"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?level=A1&limit=150")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 with limit > 100"
echo ""
fi

# Test 9: POST /api/chat
if ! skip_test 9; then
echo "Test 9: POST /api/chat - Chat com tutor de espanhol"
CHAT_RESPONSE=$(curl -s -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_chat", "message": "Como posso melhorar meu espanhol?"}')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_chat", "message": "Como posso melhorar meu espanhol?"}')

[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200 for chat endpoint"

echo "$CHAT_RESPONSE" | grep -q '"success":true' && echo "  ✓ Response success is true"
echo "$CHAT_RESPONSE" | grep -q '"message":' && echo "  ✓ Has message from tutor"
echo "$CHAT_RESPONSE" | grep -q '"username":"test_chat"' && echo "  ✓ Has correct username"
echo "$CHAT_RESPONSE" | grep -q '"timestamp":' && echo "  ✓ Has timestamp"

TUTOR_MSG=$(echo "$CHAT_RESPONSE" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p' | tr -s '[:space:]' ' ' | cut -c1-100)
echo -e "${YELLOW}  Tutor response: ${TUTOR_MSG}...${NC}"
echo ""
fi

# Test 9B: POST /api/chat without message
if ! skip_test 9B; then
echo "Test 9B: POST /api/chat without message (should return 400)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_chat"}')
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 when message missing"
echo ""
fi

# Test 10: Smart repetition
if ! skip_test 10; then
# This test validates that exercises with higher score are prioritized on next fetch:
# score = (wrong_count * 2) + (seconds_without_seeing)
echo "Test 10: Smart repetition (score-based prioritization)"

SRSUSER="test_srs_user_$(date +%s)_$$"
echo ""
echo "  PASSO 1: Fetching initial exercises for $SRSUSER"
RESPONSE_SRS=$(curl -s "$API/api/exercises?username=$SRSUSER")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises?username=$SRSUSER")
[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200 for initial fetch"

SRS_ID_A=$(echo "$RESPONSE_SRS" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
SRS_ID_B=$(echo "$RESPONSE_SRS" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
SRS_ID_C=$(echo "$RESPONSE_SRS" | grep -o '"id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
SRS_WORD_A=$(echo "$RESPONSE_SRS" | grep -o '"palavra":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
SRS_WORD_B=$(echo "$RESPONSE_SRS" | grep -o '"palavra":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
SRS_WORD_C=$(echo "$RESPONSE_SRS" | grep -o '"palavra":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
SRS_CORRECT_C=$(curl -s -X POST "$API/api/exercises/check" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$SRSUSER\", \"answer\": {\"exerciseId\": \"$SRS_ID_C\", \"userAnswer\": \"\"}}" | grep -o '"correctAnswer":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SRS_ID_A" ] || [ -z "$SRS_ID_B" ] || [ -z "$SRS_ID_C" ] || [ -z "$SRS_WORD_A" ] || [ -z "$SRS_WORD_B" ] || [ -z "$SRS_WORD_C" ]; then
  echo -e "  ${RED}✗ Could not extract 3 exercises${NC}"
else
  echo -e "  ${GREEN}✓ Captured Exercises:${NC}"
  echo "    - Exercise A (target for high score): $SRS_ID_A | word: $SRS_WORD_A"
  echo "    - Exercise B (medium score):         $SRS_ID_B | word: $SRS_WORD_B"
  echo "    - Exercise C (no repetition needed): $SRS_ID_C | word: $SRS_WORD_C"
fi
echo ""

echo "  PASSO 2: Building exercise history (simulating user performance)"
echo "    - Submitting Exercise A (3x wrong) to build high score..."
for i in {1..3}; do
  SRS_DATA="{\"username\": \"$SRSUSER\", \"answers\": [{\"exerciseId\": \"$SRS_ID_A\", \"answer\": \"wrong_answer_$i\"}]}"
  curl -s -X POST "$API/api/exercises/submit" \
    -H "Content-Type: application/json" \
    -d "$SRS_DATA" > /dev/null
done
echo -e "    ${GREEN}✓ Exercise A submitted 3x (wrong) - Expected score: (3*2) + seg_sem_ver${NC}"

echo "    - Submitting Exercise B (1x wrong) to build medium score..."
SRS_DATA_B="{\"username\": \"$SRSUSER\", \"answers\": [{\"exerciseId\": \"$SRS_ID_B\", \"answer\": \"wrong_answer_once\"}]}"
curl -s -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$SRS_DATA_B" > /dev/null
echo -e "    ${GREEN}✓ Exercise B submitted 1x (wrong) - Expected score: (1*2) + seg_sem_ver${NC}"

echo "    - Submitting Exercise C (1x correct) - should NOT be prioritized..."
SRS_DATA_C="{\"username\": \"$SRSUSER\", \"answers\": [{\"exerciseId\": \"$SRS_ID_C\", \"answer\": \"$SRS_CORRECT_C\"}]}"
curl -s -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$SRS_DATA_C" > /dev/null
echo -e "    ${GREEN}✓ Exercise C submitted 1x (correct)${NC}"

sleep 1
echo ""

echo "  PASSO 3: Fetching new exercises (should prioritize by score)"
RESPONSE_SRS_2=$(curl -s "$API/api/exercises?username=$SRSUSER")
HTTP_CODE_2=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises?username=$SRSUSER")
[ "$HTTP_CODE_2" = "200" ]
test_result $? "HTTP 200 for second fetch"
echo ""

echo "  PASSO 4: Validating smart repetition (score-based prioritization)"
if echo "$RESPONSE_SRS_2" | grep -q "\"id\":\"$SRS_ID_A\""; then
  echo -e "    ${GREEN}✓ Exercise A id (highest score) FOUND in new list${NC}"

  FILTERED=$(echo "$RESPONSE_SRS_2" | grep -o '"id":"[^"]*"' | head -5)
  if echo "$FILTERED" | grep -q "\"id\":\"$SRS_ID_A\""; then
    echo -e "    ${GREEN}✓ Exercise A id appears in prioritized positions (top 5)${NC}"
    [ "$HTTP_CODE_2" = "200" ] && [ "$HTTP_CODE" = "200" ]
    test_result $? "Smart repetition validation PASSED"
  else
    echo -e "    ${RED}✗ Exercise A id found but not in top positions (expected top 5)${NC}"
    test_result 1 "Smart repetition validation FAILED - not prioritized enough"
  fi
else
  echo -e "    ${RED}✗ Exercise A id (highest score) NOT found in new list${NC}"
  test_result 1 "Smart repetition validation FAILED - highest score not repeated"
fi

if echo "$RESPONSE_SRS_2" | grep -q "\"id\":\"$SRS_ID_B\""; then
  echo -e "    ${GREEN}✓ Exercise B id (medium score) FOUND in new list${NC}"
else
  echo -e "    ${YELLOW}⚠ Exercise B id (medium score) not found (may be filtered out)${NC}"
fi

if echo "$RESPONSE_SRS_2" | grep -q "\"id\":\"$SRS_ID_C\""; then
  echo -e "    ${YELLOW}⚠ Exercise C id (already correct) found - may be filtered by internal logic${NC}"
else
  echo -e "    ${GREEN}✓ Exercise C id (correct answer) correctly filtered out${NC}"
fi

echo ""
fi

# Summary
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
