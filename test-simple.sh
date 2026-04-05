#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API="http://localhost:3000"
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
echo "$RESPONSE" | grep -q '"correctAnswer":' && echo "  ✓ Response has correctAnswer"

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

# Test 5: Extract first exercise ID and submit
echo "Test 5: POST /api/exercises/submit with valid data"
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

# Test 6: Get exercises for same user
echo "Test 6: Get exercises for same user (verify persistence)"
RESPONSE2=$(curl -s "$API/api/exercises?username=test_user1")
COUNT2=$(echo "$RESPONSE2" | grep -o '"id":' | wc -l)
echo "  Exercises count: $COUNT2 (expected 10)"
[ "$COUNT2" = "10" ]
test_result $? "Array size correct"
echo ""

# Test 7: Multiple answers (mixed correct/incorrect)
echo "Test 7: POST with multiple answers (mixed)"
RESPONSE3=$(curl -s "$API/api/exercises?username=test_user2")
ID1=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
ID2=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
ID3=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
ID4=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '4p' | cut -d'"' -f4)
ID5=$(echo "$RESPONSE3" | grep -o '"id":"[^"]*"' | sed -n '5p' | cut -d'"' -f4)

MIXED_DATA="{\"username\": \"test_user2\", \"answers\": [{\"exerciseId\": \"$ID1\", \"correct\": true},{\"exerciseId\": \"$ID2\", \"correct\": true},{\"exerciseId\": \"$ID3\", \"correct\": true},{\"exerciseId\": \"$ID4\", \"correct\": false},{\"exerciseId\": \"$ID5\", \"correct\": false}]}"
MIXED_RESPONSE=$(curl -s -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$MIXED_DATA")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/exercises/submit" \
  -H "Content-Type: application/json" \
  -d "$MIXED_DATA")

[ "$HTTP_CODE" = "200" ]
test_result $? "HTTP 200 for mixed answers"

echo "  Response: $MIXED_RESPONSE"
echo "$MIXED_RESPONSE" | grep -q '"accuracy":60' && echo -e "  ${GREEN}✓ Accuracy is 60%${NC}" || echo "  ✗ Accuracy should be 60%: $(echo $MIXED_RESPONSE | grep -o '"accuracy":[0-9]*')"
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
