#!/bin/bash

# Configuração do Docker Context para aspire-m5
# Estratégia: Testar SSH diretamente (muitos hosts bloqueiam ICMP/ping)

CONTEXT_NAME="aspire-m5"
SSH_USER="tiago"
BASE_IP="192.168.15"
START_RANGE=2
END_RANGE=20

echo "🔍 Buscando máquinas com Docker na rede ${BASE_IP}.x (${BASE_IP}.${START_RANGE}-${BASE_IP}.${END_RANGE})..."
echo ""
echo "⏳ Testando SSH em paralelo (pode levar alguns segundos)..."

DOCKER_HOSTS=()
TEMP_FILE=$(mktemp)

# Testando SSH em paralelo
for ((i=START_RANGE; i<=END_RANGE; i++)); do
    IP="${BASE_IP}.$i"
    (
        # Testar SSH com timeout
        if timeout 2 ssh -o ConnectTimeout=2 -o BatchMode=yes -o StrictHostKeyChecking=no \
            "${SSH_USER}@${IP}" "docker version" &>/dev/null 2>&1; then
            echo "$IP" >> "$TEMP_FILE"
            echo "  ✓ $IP (Docker encontrado)"
        fi
    ) &
done

# Aguardar todos os testes terminarem
wait

# Ler IPs com Docker
if [ -f "$TEMP_FILE" ]; then
    mapfile -t DOCKER_HOSTS < "$TEMP_FILE"
    rm -f "$TEMP_FILE"
fi

echo ""

if [ ${#DOCKER_HOSTS[@]} -eq 0 ]; then
    echo "❌ Nenhuma máquina com Docker foi encontrada no range ${BASE_IP}.${START_RANGE}-${END_RANGE}"
    echo ""
    echo "💡 Dicas:"
    echo "  - Verifique se o host está online"
    echo "  - Verifique SSH: ssh ${SSH_USER}@${BASE_IP}.X"
    echo "  - Verifique Docker: ssh ${SSH_USER}@${BASE_IP}.X docker version"
    exit 1
fi

# Usar o primeiro host encontrado
SELECTED_IP="${DOCKER_HOSTS[0]}"

echo "✅ Máquinas disponíveis:"
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
