#!/bin/bash

# Inicializa a variável com o parâmetro de segundo plano (-d) por padrão
DETACH_PARAM="-d"

# Verifica se o argumento "--debug" foi passado para o script
if [ "$1" == "--debug" ]; then
  DETACH_PARAM=""
  echo "🐛 Modo debug ativado: os logs serão exibidos no terminal."
fi

# Executa o docker compose aplicando a variável dinâmica
docker compose up --build $DETACH_PARAM

if [ "$1" == "--log" ]; then
  APP=$2
  echo 
  echo "🐛 Exbindo log da aplicação $APP"
  ./docker-logs.sh $APP
fi