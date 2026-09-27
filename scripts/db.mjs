#!/usr/bin/env node
/**
 * Operações do banco local (Supabase em Docker).
 *
 *   node scripts/db.mjs reset-prod   apaga TODOS os dados e aplica só o seed de produção
 *   node scripts/db.mjs reset-demo   apaga tudo e recarrega produção + demonstração
 *   node scripts/db.mjs migrate      aplica migrations pendentes
 *   node scripts/db.mjs types        regenera src/services/supabase/database.types.ts
 *
 * Os resets pedem confirmação digitada; `--sim` pula a pergunta (uso em CI).
 * Nenhum deles altera o schema: só dados.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const compose = ['compose', '-f', join(raiz, 'docker', 'docker-compose.yml')]

function lerEnv() {
  const valores = {}
  for (const linha of readFileSync(join(raiz, 'docker', '.env'), 'utf8').split(/\r?\n/)) {
    const par = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (par) valores[par[1]] = par[2].replace(/^"(.*)"$/, '$1')
  }
  return valores
}

function docker(argumentos, opcoes = {}) {
  return execFileSync('docker', [...compose, ...argumentos], { stdio: 'inherit', ...opcoes })
}

async function confirmar(mensagem) {
  if (process.argv.includes('--sim')) return
  const leitor = createInterface({ input: process.stdin, output: process.stdout })
  const resposta = await leitor.question(`${mensagem}\nDigite ZERAR para continuar: `)
  leitor.close()
  if (resposta.trim() !== 'ZERAR') {
    console.log('Cancelado.')
    process.exit(1)
  }
}

/** Arquivos físicos só saem pela API do Storage (o SQL apaga só metadados). */
async function esvaziarBucket(env) {
  const servico = createClient(env.SUPABASE_PUBLIC_URL, env.SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { error } = await servico.storage.emptyBucket('documents')
  if (error && !/not found/i.test(error.message)) throw new Error(`Falha ao esvaziar o bucket: ${error.message}`)
}

async function resetar(modo) {
  const env = lerEnv()
  await confirmar(
    modo === 'prod'
      ? 'ATENÇÃO: isto apaga TODOS os dados (clientes, processos, documentos, contas) e deixa só o mínimo de produção.'
      : 'ATENÇÃO: isto apaga TODOS os dados e recarrega a base de demonstração.',
  )
  console.log('==> Removendo arquivos do bucket "documents"')
  await esvaziarBucket(env)
  docker(['run', '--rm', '--no-deps', '--entrypoint', '/bin/sh', 'migrate', '/scripts/reset.sh', modo])
  if (modo === 'prod') {
    console.log(`\nBanco zerado. Entre com ${env.ADMIN_EMAIL} e a senha ADMIN_INITIAL_PASSWORD de docker/.env.`)
  }
}

function gerarTipos() {
  const env = lerEnv()
  const url = `postgresql://postgres:${env.POSTGRES_PASSWORD}@localhost:${env.POSTGRES_PORT}/postgres?sslmode=disable`
  const tipos = execFileSync(
    'npx',
    ['--yes', 'supabase@latest', 'gen', 'types', 'typescript', '--db-url', url, '--schema', 'public'],
    { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  writeFileSync(join(raiz, 'src', 'services', 'supabase', 'database.types.ts'), tipos, 'utf8')
  console.log('Tipos atualizados em src/services/supabase/database.types.ts')
}

const comando = process.argv[2]
switch (comando) {
  case 'reset-prod':
    await resetar('prod')
    break
  case 'reset-demo':
    await resetar('demo')
    break
  case 'migrate':
    docker(['up', 'migrate'])
    break
  case 'types':
    gerarTipos()
    break
  default:
    console.log('Uso: node scripts/db.mjs <reset-prod | reset-demo | migrate | types> [--sim]')
    process.exit(1)
}
