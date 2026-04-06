#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# API="http://localhost:3000"
API="http://192.168.15.14:3000"
PASS=0
FAIL=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC} - $2"
    ((PASS++))
  else
    echo -e "${RED}✗ FAILED${NC} - $2"
    ((FAIL++))
  fi
}

echo -e "${YELLOW}=== Testing Exercises API ===${NC}\n"

# Test 1: Server running
echo "Test 1: Server is running"
curl -s "$API/" > /dev/null 2>&1
test_result $? "GET /"
echo ""

# Test 2: GET without username
echo "Test 2: GET /api/exercises without username (should return 400)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400"
echo ""

# Test 3: GET with username
echo "Test 3: GET /api/exercises with username"
RESPONSE=$(curl -s "$API/api/exercises?username=test_user1")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises?username=test_user1")
[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200"

# Check if response contains exercises (simple grep)
echo "$RESPONSE" | grep -q '"id":' && echo "  ✓  Response has exercises"
echo "$RESPONSE" | grep -q '"type":' && echo "  ✓ Response has type field"

# Check that correctAnswer is NOT exposed
if echo "$RESPONSE" | grep -q '"correctAnswer":'; then
  echo -e "  ${RED}✗ Response should NOT contain correctAnswer${NC}"
else
  echo -e "  ${GREEN}✓ correctAnswer is NOT exposed${NC}"
fi

# Count exercises
COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
echo -e "${YELLOW}  Exercises count: $COUNT (expected 10)${NC}"
[ "$COUNT" = "10" ] && echo -e "  ${GREEN}✓ Correct count${NC}" || echo -e "  ${RED}✗ Wrong count${NC}"
echo ""

# Test 4: POST without body
echo "Test 4: POST /api/exercises/submit without required fields"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" -d '{}')
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400"
echo ""

# Test 5: Extract first exercise ID and submit (OLD FORMAT for compatibility)
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

# Test 5B: NEW FORMAT with userAnswer validation
echo "Test 5B: POST /api/exercises/submit - NEW FORMAT (with answer/userAnswer)"
RESPONSE_NEW=$(curl -s "$API/api/exercises?username=test_user_new")
EXERCISE_ID_NEW=$(echo "$RESPONSE_NEW" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Using exercise ID: $EXERCISE_ID_NEW"

# For this test, we'll send a sample answer (server validates it against correctAnswer)
# Example: sending "Hola" as answer
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

# Test 6: Get exercises for same user
echo "Test 6: Get exercises for same user (verify persistence)"
RESPONSE2=$(curl -s "$API/api/exercises?username=test_user1")
COUNT2=$(echo "$RESPONSE2" | grep -o '"id":' | wc -l)
echo "  Exercises count: $COUNT2 (expected 10)"
[ "$COUNT2" = "10" ]
test_result $? "Array size correct"
echo ""

# Test 7: Multiple answers (mixed correct/incorrect)
echo "Test 7: POST with multiple answers (mixed) - NEW FORMAT"
RESPONSE3=$(curl -s "$API/api/exercises?username=test_user2")
ID1=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
ID2=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
ID3=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
ID4=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '4p' | cut -d'"' -f4)
ID5=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '5p' | cut -d'"' -f4)

# Using answerfield with sample data (server will validate)
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

# Test 8: GET /api/phrases - List phrases by level with pagination
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

# Check if data array has items with required fields
DATA_COUNT=$(echo "$PHRASES_RESPONSE" | grep -o '"id":' | wc -l)
echo "  Phrases returned: $DATA_COUNT (expected 5 or less)"
[ "$DATA_COUNT" -le 5 ] && echo -e "  ${GREEN}✓ Correct or fewer items${NC}" || echo -e "  ${RED}✗ Too many items${NC}"

# Test invalid parameters
echo "Test 8B: GET /api/phrases without level (should fail)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?page=1&limit=5")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 without level parameter"

echo "Test 8C: GET /api/phrases with invalid limit"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?level=A1&limit=150")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 with limit > 100"
echo ""

# Test 8: GET /api/phrases with pagination
echo "Test 8: GET /api/phrases with pagination"
PHRASES_RESPONSE=$(curl -s "$API/api/phrases?level=A1&page=1&limit=10")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?level=A1&page=1&limit=10")

[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200 for phrases endpoint"

echo "$PHRASES_RESPONSE" | grep -q '"level":"A1"' && echo "  ✓ Has level field"
echo "$PHRASES_RESPONSE" | grep -q '"total":' && echo "  ✓ Has total count"
echo "$PHRASES_RESPONSE" | grep -q '"page":1' && echo "  ✓ Has page info"
echo "$PHRASES_RESPONSE" | grep -q '"totalPages":' && echo "  ✓ Has totalPages"
echo "$PHRASES_RESPONSE" | grep -q '"data":\[' && echo "  ✓ Has data array"

PHRASE_COUNT=$(echo "$PHRASES_RESPONSE" | grep -o '"id":"' | wc -l)
echo -e "${YELLOW}  Phrases count: $PHRASE_COUNT (expected 10)${NC}"
[ "$PHRASE_COUNT" = "10" ] && echo -e "  ${GREEN}✓ Correct count${NC}" || echo -e "  ${RED}✗ Wrong count${NC}"
echo ""

# Test 8B: GET /api/phrases without level (should fail)
echo "Test 8B: GET /api/phrases without level (should return 400)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 when level missing"
echo ""

# Test 8C: GET /api/phrases with invalid limit
echo "Test 8C: GET /api/phrases with invalid limit (should return 400)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/phrases?level=A1&limit=150")
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 when limit > 100"
echo ""

# Test 9: POST /api/chat - Chat com tutor
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

# Show tutor response (truncated)
TUTOR_MSG=$(echo "$CHAT_RESPONSE" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write((data.message||'').replace(/\s+/g,' ').trim().slice(0,100));")
echo -e "${YELLOW}  Tutor response: ${TUTOR_MSG}...${NC}"
echo ""

# Test 9B: POST /api/chat without message
echo "Test 9B: POST /api/chat without message (should return 400)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_chat"}')
[ "$HTTP_CODE" = "400" ]
test_result $? "HTTP 400 when message missing"
echo ""

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
