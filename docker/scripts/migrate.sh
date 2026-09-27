#!/bin/sh
# Aplica as migrations pendentes e, na primeira subida, o seed escolhido.
#
# Executado pelo serviço `migrate` do docker-compose a cada `up`. Idempotente:
#   * migrations já aplicadas ficam registradas em supabase_migrations.schema_migrations
#     (mesma tabela usada pelo Supabase CLI) e são ignoradas;
#   * o seed só roda quando o banco ainda não recebeu nenhum (supabase_migrations.seed_state).
#
# SEED_MODE: demo (padrão) = produção + dados de demonstração · prod = só o mínimo · none

set -eu

export PGPASSWORD="$POSTGRES_PASSWORD"

# Migrations rodam como `postgres` (dono dos objetos, como no Supabase hospedado).
app_psql() { psql -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
# Seeds escrevem em auth.users: rodam como superusuário.
admin_psql() { psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin "$@"; }

echo "==> Aguardando o banco"
until pg_isready -q -U postgres; do sleep 1; done

app_psql <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
create table if not exists supabase_migrations.seed_state (
  id boolean primary key default true check (id),
  mode text not null,
  applied_at timestamptz not null default now()
);
SQL

echo "==> Migrations"
for file in $(ls /migrations/*.sql | sort); do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  applied=$(app_psql -tA -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")
  if [ "$applied" = "1" ]; then
    continue
  fi
  echo "    aplicando $base"
  app_psql --single-transaction -f "$file"
  app_psql -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
done

seeded=$(app_psql -tA -c "select mode from supabase_migrations.seed_state")
if [ -n "$seeded" ]; then
  echo "==> Seed já aplicado ($seeded) — nada a fazer"
  exit 0
fi

# A saída das consultas vai para /dev/null: o seed lida com senhas e nada
# disso pode aparecer nos logs do container. Erros continuam no stderr.
run_seed() {
  admin_psql --single-transaction -o /dev/null \
    -v admin_email="$ADMIN_EMAIL" \
    -v admin_name="$ADMIN_NAME" \
    -v admin_password="$ADMIN_INITIAL_PASSWORD" \
    -v demo_password="${DEMO_PASSWORD:-}" \
    -f "$1"
}

case "${SEED_MODE:-demo}" in
  none)
    echo "==> SEED_MODE=none — banco sem dados"
    ;;
  prod)
    echo "==> Seed de produção"
    run_seed /seed/seed_prod.sql
    app_psql -c "insert into supabase_migrations.seed_state (mode) values ('prod')"
    ;;
  demo)
    if [ -z "${DEMO_PASSWORD:-}" ]; then
      echo "DEMO_PASSWORD é obrigatório com SEED_MODE=demo" >&2
      exit 1
    fi
    echo "==> Seed de produção + demonstração"
    run_seed /seed/seed_prod.sql
    run_seed /seed/seed_demo.sql
    app_psql -c "insert into supabase_migrations.seed_state (mode) values ('demo')"
    ;;
  *)
    echo "SEED_MODE inválido: $SEED_MODE (use demo, prod ou none)" >&2
    exit 1
    ;;
esac

echo "==> Pronto"
