#!/bin/bash

# Configuração do Docker Context para aspire-m5
# Versão com nmap para descoberta mais robusta

CONTEXT_NAME="aspire-m5"
SSH_USER="tiago"
SSH_PORT=22
BASE_IP="192.168.15"
START_RANGE=2
END_RANGE=20

echo "🔍 Buscando máquinas com Docker na rede ${BASE_IP}.x (${BASE_IP}.${START_RANGE}-${BASE_IP}.${END_RANGE})..."
echo ""

# Verificar se nmap está instalado
if ! command -v nmap &> /dev/null; then
    echo "⚠️  nmap não está instalado. Usando fallback com SSH direto..."
    echo ""
    
    # Fallback: testar SSH em paralelo
    DOCKER_HOSTS=()
    TEMP_FILE=$(mktemp)
    
    echo "⏳ Testando SSH em paralelo..."
    
    for ((i=START_RANGE; i<=END_RANGE; i++)); do
        IP="${BASE_IP}.$i"
        (
            if timeout 2 ssh -o ConnectTimeout=2 -o BatchMode=yes -o StrictHostKeyChecking=no \
                "${SSH_USER}@${IP}" "docker version" &>/dev/null 2>&1; then
                echo "$IP" >> "$TEMP_FILE"
                echo "  ✓ $IP (Docker encontrado)"
            fi
        ) &
    done
    
    wait
    
    if [ -f "$TEMP_FILE" ]; then
        mapfile -t DOCKER_HOSTS < "$TEMP_FILE"
        rm -f "$TEMP_FILE"
    fi
else
    # Usar nmap para descobrir hosts com porta 22 aberta
    echo "📡 Escaneando porta SSH (22) com nmap..."
    NMAP_RESULTS=$(nmap -p $SSH_PORT --open -oG - "${BASE_IP}.${START_RANGE}-${END_RANGE}" 2>/dev/null | grep "Host:" | awk '{print $2}')
    
    if [ -z "$NMAP_RESULTS" ]; then
        echo "⚠️  Nmap não encontrou hosts com SSH. Usando fallback..."
        
        DOCKER_HOSTS=()
        TEMP_FILE=$(mktemp)
        
        echo "⏳ Testando SSH em paralelo..."
        
        for ((i=START_RANGE; i<=END_RANGE; i++)); do
            IP="${BASE_IP}.$i"
            (
                if timeout 2 ssh -o ConnectTimeout=2 -o BatchMode=yes -o StrictHostKeyChecking=no \
                    "${SSH_USER}@${IP}" "docker version" &>/dev/null 2>&1; then
                    echo "$IP" >> "$TEMP_FILE"
                fi
            ) &
        done
        
        wait
        
        if [ -f "$TEMP_FILE" ]; then
            mapfile -t DOCKER_HOSTS < "$TEMP_FILE"
            rm -f "$TEMP_FILE"
        fi
    else
        # Testar Docker nos hosts encontrados por nmap
        echo ""
        echo "🔐 Testando Docker nos hosts encontrados..."
        
        DOCKER_HOSTS=()
        
        for IP in $NMAP_RESULTS; do
            echo -n "  $IP... "
            
            if timeout 3 ssh -o ConnectTimeout=3 -o BatchMode=yes -o StrictHostKeyChecking=no \
                "${SSH_USER}@${IP}" "docker version" &>/dev/null 2>&1; then
                echo "✓ Docker"
                DOCKER_HOSTS+=("$IP")
            else
                echo "✗ (Docker não encontrado)"
            fi
        done
    fi
fi

echo ""

if [ ${#DOCKER_HOSTS[@]} -eq 0 ]; then
    echo "❌ Nenhuma máquina com Docker foi encontrada no range ${BASE_IP}.${START_RANGE}-${END_RANGE}"
    echo ""
    echo "💡 Sugestões:"
    echo "  1. Instalar nmap: sudo apt-get install nmap (Linux) ou brew install nmap (macOS)"
    echo "  2. Testar SSH manualmente: ssh ${SSH_USER}@${BASE_IP}.X"
    echo "  3. Verificar firewall do host"
    exit 1
fi

# Usar o primeiro host encontrado
SELECTED_IP="${DOCKER_HOSTS[0]}"

echo "✅ Máquinas com Docker encontradas:"
for host in "${DOCKER_HOSTS[@]}"; do
    if [ "$host" = "$SELECTED_IP" ]; then
        echo "   → $host (será usado)"
    else
        echo "   • $host"
    fi
done

echo ""
echo "🐳 Configurando Docker Context para $SELECTED_IP..."

# Limpar contexto antigo
docker context use default 2>/dev/null || true
docker context rm -f $CONTEXT_NAME 2>/dev/null || true

# Criar novo contexto
if ! docker context create $CONTEXT_NAME --docker "host=ssh://${SSH_USER}@${SELECTED_IP}"; then
    echo "❌ Erro ao criar Docker Context"
    exit 1
fi

# Usar o novo contexto
docker context use $CONTEXT_NAME

echo "✅ Docker Context '$CONTEXT_NAME' criado"
echo ""
echo "🧪 Testando conexão..."

if docker version --format="Server: {{.Server.Version}}, Client: {{.Client.Version}}"; then
    echo ""
    echo "✅ Sucesso! Docker Context configurado"
    echo "   Host: ssh://${SSH_USER}@${SELECTED_IP}"
    echo ""
    echo "📦 Containers ativos:"
    docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  (nenhum container ativo)"
else
    echo "❌ Erro ao conectar com Docker em $SELECTED_IP"
    exit 1
fi
