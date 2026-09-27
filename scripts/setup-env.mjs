#!/usr/bin/env node
/**
 * Gera os arquivos de ambiente locais a partir dos modelos:
 *
 *   docker/.env   ← docker/.env.example, com segredos aleatórios
 *   .env.local    ← .env.example, apontando o front para o Supabase local
 *
 * Não sobrescreve arquivos existentes (use --force para regerar tudo — isso
 * invalida sessões e exige `docker compose down -v`).
 */
import { createHmac, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const forcar = process.argv.includes('--force')

const base64url = (buffer) => Buffer.from(buffer).toString('base64url')
const aleatorio = (bytes) => randomBytes(bytes).toString('base64url')
const hex = (bytes) => randomBytes(bytes).toString('hex')

function assinarJwt(payload, segredo) {
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = base64url(JSON.stringify(payload))
  const assinatura = createHmac('sha256', segredo).update(`${cabecalho}.${corpo}`).digest('base64url')
  return `${cabecalho}.${corpo}.${assinatura}`
}

function preencher(modelo, valores) {
  return modelo
    .split('\n')
    .map((linha) => {
      const chave = linha.match(/^([A-Z0-9_]+)=/)?.[1]
      return chave && chave in valores ? `${chave}=${valores[chave]}` : linha
    })
    .join('\n')
}

function lerEnv(caminho) {
  const valores = {}
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const par = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (par) valores[par[1]] = par[2]
  }
  return valores
}

/* -- docker/.env ------------------------------------------------------------ */

const envDocker = join(raiz, 'docker', '.env')

if (existsSync(envDocker) && !forcar) {
  console.log('docker/.env já existe — mantido (use --force para regerar).')
} else {
  const jwtSecret = aleatorio(48)
  const agora = Math.floor(Date.now() / 1000)
  const expira = agora + 5 * 365 * 24 * 3600

  const segredos = {
    POSTGRES_PASSWORD: hex(24),
    JWT_SECRET: jwtSecret,
    ANON_KEY: assinarJwt({ role: 'anon', iss: 'supabase', iat: agora, exp: expira }, jwtSecret),
    SERVICE_ROLE_KEY: assinarJwt({ role: 'service_role', iss: 'supabase', iat: agora, exp: expira }, jwtSecret),
    DASHBOARD_PASSWORD: aleatorio(18),
    SECRET_KEY_BASE: aleatorio(64),
    REALTIME_ENC_KEY: hex(8), // 16 caracteres
    PG_META_CRYPTO_KEY: aleatorio(32),
    ADMIN_INITIAL_PASSWORD: aleatorio(12),
  }

  if (segredos.REALTIME_ENC_KEY.length !== 16) throw new Error('REALTIME_ENC_KEY precisa de 16 caracteres')

  const modelo = readFileSync(join(raiz, 'docker', '.env.example'), 'utf8')
  writeFileSync(envDocker, preencher(modelo, segredos), 'utf8')
  console.log('docker/.env gerado com segredos novos.')
  console.log(`  Administrador inicial: senha em ADMIN_INITIAL_PASSWORD (docker/.env)`)
}

/* -- .env.local (front) ------------------------------------------------------- */

const envFront = join(raiz, '.env.local')
const docker = lerEnv(envDocker)

if (existsSync(envFront) && !forcar) {
  console.log('.env.local já existe — mantido.')
} else {
  const modelo = readFileSync(join(raiz, '.env.example'), 'utf8')
  writeFileSync(
    envFront,
    preencher(modelo, {
      VITE_SUPABASE_URL: docker.SUPABASE_PUBLIC_URL,
      VITE_SUPABASE_ANON_KEY: docker.ANON_KEY,
    }),
    'utf8',
  )
  console.log('.env.local gerado para o front.')
}

/* -- Conferências -------------------------------------------------------------- */

const enc = docker.REALTIME_ENC_KEY ?? ''
if (enc.length !== 16) {
  console.error(`\nATENÇÃO: REALTIME_ENC_KEY tem ${enc.length} caracteres; o Realtime exige exatamente 16.`)
  process.exitCode = 1
}
