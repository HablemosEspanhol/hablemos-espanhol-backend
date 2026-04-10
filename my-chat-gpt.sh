#!/bin/bash

# Cores ANSI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuração
# API="http://localhost:3000"
API="http://192.168.15.14:3000"
USERNAME=""
HISTORY_FILE="$HOME/.hablemos_chat_history"

# Função para exibir banner
show_banner() {
  clear
  echo -e "${CYAN}"
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║                                                        ║"
  echo "║          🎓 HABLEMOS ESPANHOL - Chat Mode 🎓          ║"
  echo "║         Conversa com seu Tutor de Espanhol IA         ║"
  echo "║                                                        ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# Função para obter username
get_username() {
  while [ -z "$USERNAME" ]; do
    echo -e "${YELLOW}Digite seu username:${NC}"
    read -p "> " USERNAME
    
    if [ -z "$USERNAME" ]; then
      echo -e "${RED}❌ Username não pode ser vazio!${NC}"
    fi
  done
  
  echo -e "${GREEN}✓ Conectado como: ${BLUE}$USERNAME${NC}\n"
}

# Função para enviar mensagem ao chat
send_message() {
  local message="$1"
  
  if [ -z "$message" ]; then
    return 1
  fi

  # Enviar para API
  local response=$(curl -s -X POST "$API/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$USERNAME\", \"message\": \"$message\"}")

  # Validar resposta
  if echo "$response" | grep -q '"success":true'; then
    # Extrair mensagem do tutor com JSON seguro
    local tutor_message=$(echo "$response" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write((data.message||'').replace(/\s+/g,' ').trim());")
    local user_level=$(echo "$response" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(data.userLevel||'A1');")
    
    # Exibir resposta
    echo -e "${MAGENTA}👤 Você:${NC} $message\n"
    echo -e "${CYAN}🤖 Tutor ($user_level):${NC} $tutor_message\n"
    
    # Salvar no histórico
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Você: $message" >> "$HISTORY_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tutor: $tutor_message" >> "$HISTORY_FILE"
    echo "---" >> "$HISTORY_FILE"
    
  else
    echo -e "${RED}❌ Erro ao conectar com o servidor${NC}"
    return 1
  fi
}

# Função para exibir comandos disponíveis
show_help() {
  echo -e "${YELLOW}Comandos disponíveis:${NC}"
  echo -e "  ${GREEN}/help${NC}      - Mostra esta mensagem"
  echo -e "  ${GREEN}/history${NC}   - Ver histórico de conversa"
  echo -e "  ${GREEN}/clear${NC}     - Limpar histórico"
  echo -e "  ${GREEN}/exit${NC}      - Sair da conversa"
  echo -e "  ${GREEN}/user${NC}      - Mudar username\n"
}

# Função para exibir histórico
show_history() {
  if [ -f "$HISTORY_FILE" ]; then
    echo -e "${YELLOW}📜 Histórico de Conversa:${NC}\n"
    cat "$HISTORY_FILE"
    echo ""
  else
    echo -e "${YELLOW}Nenhuma conversa anterior${NC}\n"
  fi
}

# Função para limpar histórico
clear_history() {
  rm -f "$HISTORY_FILE"
  echo -e "${GREEN}✓ Histórico limpo${NC}\n"
}

# Função principal de loop
chat_loop() {
  echo -e "${YELLOW}Dicas:${NC}"
  echo -e "  • Digite ${GREEN}/help${NC} para ver comandos"
  echo -e "  • Digite ${GREEN}/history${NC} para ver histórico"
  echo -e "  • Digite ${GREEN}/exit${NC} para sair\n"
  
  while true; do
    echo -ne "${GREEN}→${NC} "
    read -p "" input
    
    case "$input" in
      /exit|exit|sair)
        echo -e "\n${CYAN}Até logo! Ótimo trabalho praticando espanhol! 👋${NC}\n"
        exit 0
        ;;
      /help)
        show_help
        ;;
      /history)
        show_history
        ;;
      /clear)
        clear_history
        ;;
      /user)
        USERNAME=""
        get_username
        ;;
      "")
        # Ignorar entrada vazia
        ;;
      *)
        # Enviar mensagem
        if ! send_message "$input"; then
          echo -e "${RED}Erro ao enviar mensagem. Tente novamente.${NC}\n"
        fi
        ;;
    esac
  done
}

# Função para testar conexão
test_connection() {
  echo -e "${YELLOW}🔌 Testando conexão com servidor...${NC}"
  
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/")
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Servidor está respondendo${NC}\n"
    return 0
  else
    echo -e "${RED}✗ Erro ao conectar com servidor (HTTP $http_code)${NC}"
    echo -e "${YELLOW}Certifique-se que a aplicação está rodando:${NC}"
    echo -e "  cd backend-app && npm start\n"
    exit 1
  fi
}

# Main
show_banner
test_connection
get_username
chat_loop
