#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API="http://192.168.15.12:3002"
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
  echo "Test 4: GET /api/exercises without username"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  [ "$HTTP_CODE" = "400" ]
  test_result $? "HTTP 400"
  echo ""
fi

if ! skip_test 5; then
  echo "Test 5: GET /api/exercises with username and Bearer token"
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
  echo "Test 6: GET /api/exercises/v2 with username and Bearer token"
  RESPONSE_V2=$(curl -s "$API/api/exercises/v2?username=test_user1" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/exercises/v2?username=test_user1" \
    -H "Authorization: Bearer $AUTH_TOKEN")
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
