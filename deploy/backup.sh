#!/bin/sh
# Respaldo diario de Postgres (cron en el VPS): 0 4 * * * /ruta/deploy/backup.sh
# Conserva 14 días. Copia la carpeta backups/ fuera del VPS (rclone, scp…).
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose exec -T db pg_dump -U trascendental -d trascendental -Fc > "backups/trascendental-$(date +%F).dump"
find backups -name 'trascendental-*.dump' -mtime +14 -delete
