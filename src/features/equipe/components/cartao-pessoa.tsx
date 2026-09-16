import { Activity, AlarmClock, Gauge, Pencil, ShieldCheck, UsersRound } from 'lucide-react'
import { Estatistica, GradeEstatisticas } from '@/components/graficos/estatistica'
import { BarraSimples } from '@/components/graficos/marcas'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatarDataHora } from '@/lib/formato'
import { ROTULO_PAPEL } from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import type { PainelAnalitico } from '@/services/contratos'
import type { Usuario } from '@/types/domain'

type Carga = PainelAnalitico['cargaEquipe'][number]

export function ResumoEquipe({
  usuarios,
  carga,
  carregando,
}: {
  usuarios: Usuario[]
  carga?: Carga[]
  carregando: boolean
}) {
  const ativos = usuarios.filter((usuario) => usuario.ativo)
  const emAndamento = carga?.reduce((soma, linha) => soma + linha.ativos, 0) ?? 0
  const atrasados = carga?.reduce((soma, linha) => soma + linha.atrasados, 0) ?? 0
  const comCarga = carga?.length ?? 0

  return (
    <GradeEstatisticas>
      <Estatistica
        rotulo="Pessoas com acesso"
        valor={ativos.length}
        icone={UsersRound}
        carregando={carregando}
        descricao={`${usuarios.length - ativos.length} com acesso suspenso`}
      />
      <Estatistica
        rotulo="Subprocessos em andamento"
        valor={emAndamento}
        icone={Activity}
        carregando={carregando}
        descricao={`Distribuídos entre ${comCarga} ${comCarga === 1 ? 'pessoa' : 'pessoas'}`}
      />
      <Estatistica
        rotulo="Carga média"
        valor={comCarga > 0 ? Math.round(emAndamento / comCarga) : 0}
        icone={Gauge}
        tom="info"
        carregando={carregando}
        descricao="Subprocessos ativos por responsável"
      />
      <Estatistica
        rotulo="Em atraso"
        valor={atrasados}
        icone={AlarmClock}
        tom={atrasados > 0 ? 'perigo' : 'sucesso'}
        carregando={carregando}
        descricao="Subprocessos com prazo vencido"
      />
    </GradeEstatisticas>
  )
}

export function CartaoPessoa({
  usuario,
  carga,
  maiorCarga,
  podeEditar,
  aoEditar,
}: {
  usuario: Usuario
  carga?: Carga
  maiorCarga: number
  podeEditar: boolean
  aoEditar: () => void
}) {
  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-xs',
        !usuario.ativo && 'bg-surface-muted',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar nome={usuario.nome} tamanho="lg" className={cn(!usuario.ativo && 'opacity-60')} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.98rem] font-bold tracking-[-0.02em]">{usuario.nome}</h3>
          <p className="truncate text-xs text-muted-foreground">{usuario.cargo ?? ROTULO_PAPEL[usuario.papel]}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tom={usuario.papel === 'super_admin' ? 'primario' : 'contorno'} tamanho="sm">
              <ShieldCheck aria-hidden="true" />
              {ROTULO_PAPEL[usuario.papel]}
            </Badge>
            {!usuario.ativo && (
              <Badge tom="neutro" tamanho="sm">
                Acesso suspenso
              </Badge>
            )}
          </div>
        </div>
        {podeEditar && (
          <Button variante="contorno" tamanho="iconeSm" onClick={aoEditar}>
            <Pencil aria-hidden="true" />
            <span className="sr-only">Editar {usuario.nome}</span>
          </Button>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {carga ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Subprocessos ativos</span>
              <span className="alc-numero text-lg">{carga.ativos}</span>
            </div>
            <BarraSimples
              valor={carga.ativos}
              maximo={maiorCarga}
              rotulo={`${usuario.nome}: ${carga.ativos} subprocessos ativos`}
            />
            <div className="mt-2.5">
              {carga.atrasados > 0 ? (
                <Badge tom="perigo" tamanho="sm">
                  <AlarmClock aria-hidden="true" />
                  {carga.atrasados} em atraso
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum subprocesso em atraso</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Sem subprocessos atribuídos no momento.</p>
        )}
      </div>

      <p className="mt-auto truncate pt-4 text-[11px] text-muted-foreground">
        {usuario.email}
        {usuario.ultimoAcessoEm && <> · último acesso em {formatarDataHora(usuario.ultimoAcessoEm)}</>}
      </p>
    </article>
  )
}
