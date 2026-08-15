# Scripts de Descoberta do Docker Host

Dois scripts estão disponíveis para descobrir e configurar automaticamente a conexão com o Docker na máquina remota:

## 1. `set-docker-network.sh` (Padrão)

**Estratégia**: Testa SSH em paralelo no range `192.168.15.2-20`

```bash
cd /c/Users/tiago/dev-projects/JavierChopek/hablemos-espanhol-backend
bash scripts/set-docker-network.sh
```

**Fluxo**:
1. ⏳ Testa SSH em paralelo em todos os IPs do range (rápido)
2. ✓ Para cada IP que responde, verifica se tem Docker instalado
3. 🐳 Configura Docker Context com o primeiro host encontrado
4. 🧪 Valida a conexão

**Vantagens**:
- Rápido (execução paralela)
- Não requer ferramentas adicionais
- Direto ao ponto

**Desvantagens**:
- Depende de SSH estar acessível
- Sensível a problemas de conectividade

---

## 2. `set-docker-network-nmap.sh` (Avançado)

**Estratégia**: Usa `nmap` para descobrir hosts ativos e depois testa Docker

```bash
cd /c/Users/tiago/dev-projects/JavierChopek/hablemos-espanhol-backend
bash scripts/set-docker-network-nmap.sh
```

**Fluxo**:
1. 📡 `nmap` escaneia a porta SSH (22) no range
2. 🔐 Testa Docker em cada host encontrado
3. 🐳 Configura Docker Context
4. 🧪 Valida a conexão

**Vantagens**:
- Mais robusto (descoberta explícita de hosts)
- Fallback automático para SSH direto se nmap falhar
- Melhor para redes com firewalls

**Desvantagens**:
- Requer `nmap` instalado
- Um pouco mais lento

---

## Como Instalar nmap

### Linux (Ubuntu/Debian):
```bash
sudo apt-get install nmap
```

### macOS:
```bash
brew install nmap
```

### Windows (Git Bash):
```bash
choco install nmap
# ou
winget install Insecure.Nmap
```

---

## Variáveis Customizáveis

Edite os scripts para mudar:

```bash
# Range de IPs a testar
START_RANGE=2
END_RANGE=20

# Usuário SSH
SSH_USER="tiago"

# Nome do Docker Context criado
CONTEXT_NAME="aspire-m5"

# Base da rede
BASE_IP="192.168.15"
```

---

## Exemplos de Uso

### Testar script simples
```bash
bash scripts/set-docker-network.sh
```

### Testar com nmap (se disponível)
```bash
bash scripts/set-docker-network-nmap.sh
```

### Após sucesso, verificar contexto
```bash
docker context ls
docker ps
```

### Acessar endpoint do backend
```bash
curl http://192.168.15.12:3002/api/exercises/v2?username=test
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "Nenhuma máquina com Docker encontrada" | Verifique se máquina está online e SSH está acessível |
| Timeout no SSH | Aumentar timeout nos scripts (alterar `-o ConnectTimeout=2` para maior valor) |
| Docker Context criado mas não conecta | Verifique credenciais SSH e permissões |
| nmap não está instalado | Use `set-docker-network.sh` ou instale nmap |

---

## Fluxo Implementado (Conforme Solicitado)

✅ **Busca de IPs**: Varre range `192.168.15.2-20`
✅ **Validação em Paralelo**: Testa SSH simultaneamente em múltiplos IPs
✅ **Verificação de Docker**: Cada IP respondendo é testado para Docker
✅ **Configuração Automática**: Docker Context criado com primeiro host válido
✅ **Fallback**: Versão com nmap oferece estratégia alternativa

**Resultado**: Sistema de descoberta robusto e automatizado! 🚀
