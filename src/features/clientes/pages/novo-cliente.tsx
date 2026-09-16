import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { GuiaEtapas } from '@/components/shared/guia-etapas'
import { FormularioCliente } from '@/features/clientes/components/formulario-cliente'
import { paraEntradaCliente } from '@/features/clientes/mapeadores'
import { mensagemErroSegura } from '@/lib/privacidade'
import type { DadosCliente } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'

export default function NovoCliente() {
  const navegar = useNavigate()
  const clienteConsulta = useQueryClient()
  const [erro, setErro] = React.useState<string | null>(null)

  const criar = useMutation({
    mutationFn: (dados: DadosCliente) => servicos.clientes.criar(paraEntradaCliente(dados)),
    onSuccess: (cliente) => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.clientes.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
      toast.success('Cliente cadastrado', {
        description: `${cliente.nome} foi adicionado com o código ${cliente.codigo}.`,
      })
      navegar(`/app/clientes/${cliente.id}`)
    },
    onError: (falha) => setErro(mensagemErroSegura(falha, 'Não foi possível cadastrar o cliente.')),
  })

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Cadastro"
        titulo="Novo cliente"
        descricao="Após o cadastro, você poderá abrir o processo e definir os subprocessos aplicáveis."
        migalhas={[
          { rotulo: 'Clientes', para: '/app/clientes' },
          { rotulo: 'Novo cliente' },
        ]}
        voltarPara="/app/clientes"
        voltarRotulo="Clientes"
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <FormularioCliente
          erroServidor={erro}
          aoEnviar={async (dados) => {
            setErro(null)
            await criar.mutateAsync(dados)
          }}
          aoCancelar={() => navegar('/app/clientes')}
          rotuloEnvio="Cadastrar cliente"
        />

        <GuiaEtapas
          chapeu="Como funciona"
          titulo="Do cadastro à conclusão"
          atual={0}
          etapas={[
            {
              titulo: 'Cadastrar o cliente',
              descricao: 'Dados de contato e, se necessário, o perfil assistido.',
            },
            {
              titulo: 'Abrir o processo',
              descricao: 'Marque só os subprocessos que se aplicam ao caso.',
            },
            {
              titulo: 'Solicitar documentos',
              descricao: 'O cliente é avisado e envia pela área dele.',
            },
            {
              titulo: 'Acompanhar até a conclusão',
              descricao: 'Etapas, protocolos e decisões ficam no histórico.',
            },
          ]}
          nota="O perfil assistido é dado pessoal sensível: preencha só o necessário ao atendimento."
        />
      </div>
    </EntradaPagina>
  )
}
