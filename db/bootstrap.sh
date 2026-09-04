#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-hablemos_espanhol}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"

echo "Waiting for MySQL..."
attempts=0
max_attempts=180
until mysqladmin ping -h "$DB_HOST" -P "$DB_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD" --silent; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge "$max_attempts" ]; then
    echo "MySQL did not become ready after ${max_attempts} attempts."
    exit 1
  fi
  sleep 2
done

echo "Validating schema and applying seed..."
mysql -h "$DB_HOST" -P "$DB_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < /db/init.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < /db/insert_data.sql

echo "Database bootstrap completed."
