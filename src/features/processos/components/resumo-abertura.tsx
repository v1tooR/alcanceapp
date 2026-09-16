import { Check } from 'lucide-react'
import { CATALOGO_SUBPROCESSOS, ORDEM_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import type { TipoSubprocesso } from '@/types/domain'

/**
 * Resumo lateral da abertura de processo: o que será criado com a seleção
 * atual. Atualiza enquanto a equipe marca e desmarca subprocessos.
 */
export function ResumoAbertura({ tipos }: { tipos: TipoSubprocesso[] }) {
  const definicoes = ORDEM_SUBPROCESSOS.filter((tipo) => tipos.includes(tipo)).map(
    (tipo) => CATALOGO_SUBPROCESSOS[tipo],
  )
  const etapas = definicoes.reduce((soma, definicao) => soma + definicao.etapasSugeridas.length, 0)
  const documentos = new Set(definicoes.flatMap((definicao) => definicao.documentosSugeridos)).size

  const totais = [
    { rotulo: 'Serviços', valor: definicoes.length },
    { rotulo: 'Etapas', valor: etapas },
    { rotulo: 'Documentos', valor: documentos },
  ]

  return (
    <aside className="xl:sticky xl:top-4" aria-labelledby="titulo-resumo-abertura">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs" aria-live="polite">
        <p className="alc-chapeu text-primary">Resumo</p>
        <h2 id="titulo-resumo-abertura" className="mt-2 text-[0.98rem] font-bold tracking-[-0.02em]">
          O que será aberto
        </h2>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          {totais.map((total) => (
            <div
              key={total.rotulo}
              className="flex flex-col-reverse items-center rounded-md bg-surface-muted px-2 py-3 text-center"
            >
              <dt className="mt-1 text-[11px] font-semibold text-muted-foreground">{total.rotulo}</dt>
              <dd className="alc-numero text-[1.6rem]">{total.valor}</dd>
            </div>
          ))}
        </dl>

        {definicoes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Selecione ao menos um subprocesso.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {definicoes.map((definicao) => (
              <li key={definicao.tipo} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="truncate">{definicao.nome}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {definicao.etapasSugeridas.length} etapas
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-border pt-4 text-xs leading-snug text-muted-foreground">
          Etapas e documentos são sugestões editáveis. Depois de abrir, solicite os documentos — o
          cliente acompanha tudo pela área dele.
        </p>
      </div>
    </aside>
  )
}
