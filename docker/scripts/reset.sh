#!/bin/sh
# Zera os dados e aplica só o seed pedido — sem tocar no schema.
# Uso (via `npm run db:reset:prod`): reset.sh prod | demo
#
# Os arquivos do bucket devem ser removidos antes, pela API do Storage
# (scripts/db.mjs faz isso).

set -eu

MODO="${1:-prod}"
export PGPASSWORD="$POSTGRES_PASSWORD"

admin_psql() { psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin "$@"; }

# Saída das consultas descartada: o seed lida com senhas.
run_seed() {
  admin_psql --single-transaction -o /dev/null \
    -v admin_email="$ADMIN_EMAIL" \
    -v admin_name="$ADMIN_NAME" \
    -v admin_password="$ADMIN_INITIAL_PASSWORD" \
    -v demo_password="${DEMO_PASSWORD:-}" \
    -f "$1"
}

case "$MODO" in
  prod | demo) ;;
  *) echo "Modo inválido: $MODO (use prod ou demo)" >&2; exit 1 ;;
esac

echo "==> Apagando dados"
admin_psql --single-transaction -o /dev/null -f /seed/reset.sql

echo "==> Seed de produção"
run_seed /seed/seed_prod.sql

if [ "$MODO" = "demo" ]; then
  echo "==> Seed de demonstração"
  run_seed /seed/seed_demo.sql
fi

admin_psql -c "delete from supabase_migrations.seed_state; insert into supabase_migrations.seed_state (mode) values ('$MODO')"
echo "==> Pronto ($MODO)"
