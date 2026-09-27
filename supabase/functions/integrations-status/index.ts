/**
 * Situação das integrações, para a tela de administração — administrador.
 *
 * POST {} → [{ chave, disponivel, detalhe, provedoresDisponiveis, segredos }]
 *
 * Segredos: informa apenas SE cada variável esperada está definida neste
 * serviço — nunca o valor. `null` = o segredo pertence a outro serviço (ex.:
 * a senha SMTP fica só no serviço de autenticação) e não é visível daqui.
 */
import { servir } from '../_shared/http.ts'
import { PROVEDORES_DISPONIVEIS, listarIntegracoes, situacaoDe } from '../_shared/integrations/registro.ts'
import { exigirPapel, identificarChamador } from '../_shared/supabase.ts'

/** Segredos que moram em outro container e não são verificáveis daqui. */
const SEGREDOS_EXTERNOS = new Set(['SMTP_PASS'])

servir(async (_corpo, req) => {
  const chamador = await identificarChamador(req)
  exigirPapel(chamador, 'super_admin')

  const integracoes = await listarIntegracoes(chamador.comoServico)

  return Promise.all(
    integracoes.map(async (registro) => {
      const situacao = await situacaoDe(chamador.comoServico, registro).catch((erro) => ({
        disponivel: false,
        detalhe: `Falha ao verificar: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`,
      }))
      return {
        chave: registro.key,
        disponivel: situacao.disponivel,
        detalhe: situacao.detalhe,
        provedoresDisponiveis: PROVEDORES_DISPONIVEIS[registro.category] ?? [],
        segredos: registro.secret_names.map((nome) => ({
          nome,
          configurado: SEGREDOS_EXTERNOS.has(nome) ? null : Boolean(Deno.env.get(nome)),
        })),
      }
    }),
  )
})
