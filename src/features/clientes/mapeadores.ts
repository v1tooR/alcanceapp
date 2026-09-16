import { apenasDigitos } from '@/lib/mascaras'
import type { DadosCliente } from '@/schemas'
import type { EntradaCliente } from '@/services/contratos'
import type { Cliente, UF } from '@/types/domain'

/** Formulário → payload do serviço. Campos vazios viram `undefined`. */
export function paraEntradaCliente(dados: DadosCliente): EntradaCliente {
  const temEndereco = Boolean(dados.endereco?.cep || dados.endereco?.logradouro)

  return {
    nome: dados.nome,
    cpf: apenasDigitos(dados.cpf),
    rg: dados.rg || undefined,
    dataNascimento: dados.dataNascimento || undefined,
    email: dados.email,
    telefone: apenasDigitos(dados.telefone),
    tipo: dados.tipo,
    situacao: dados.situacao,
    responsavelId: dados.responsavelId || undefined,
    acessoPortalAtivo: dados.acessoPortalAtivo,
    observacoesInternas: dados.observacoesInternas || undefined,
    endereco: temEndereco
      ? {
          cep: apenasDigitos(dados.endereco?.cep ?? ''),
          logradouro: dados.endereco?.logradouro ?? '',
          numero: dados.endereco?.numero ?? '',
          complemento: dados.endereco?.complemento,
          bairro: dados.endereco?.bairro ?? '',
          cidade: dados.endereco?.cidade ?? '',
          uf: (dados.endereco?.uf ?? 'SP') as UF,
        }
      : undefined,
    perfilAssistido: dados.perfilAssistido
      ? {
          categorias: dados.perfilAssistido.categorias ?? [],
          possuiLaudo: dados.perfilAssistido.possuiLaudo ?? false,
          laudoValidoAte: dados.perfilAssistido.laudoValidoAte || undefined,
          observacoes: dados.perfilAssistido.observacoes || undefined,
        }
      : undefined,
  }
}

/** Cliente existente → valores iniciais do formulário. */
export function paraValoresFormulario(cliente: Cliente): DadosCliente {
  return {
    nome: cliente.nome,
    cpf: cliente.cpf,
    rg: cliente.rg ?? '',
    dataNascimento: cliente.dataNascimento ?? '',
    email: cliente.email,
    telefone: cliente.telefone,
    tipo: cliente.tipo,
    situacao: cliente.situacao,
    responsavelId: cliente.responsavelId ?? '',
    acessoPortalAtivo: cliente.acessoPortalAtivo,
    observacoesInternas: cliente.observacoesInternas ?? '',
    endereco: {
      cep: cliente.endereco?.cep ?? '',
      logradouro: cliente.endereco?.logradouro ?? '',
      numero: cliente.endereco?.numero ?? '',
      complemento: cliente.endereco?.complemento ?? '',
      bairro: cliente.endereco?.bairro ?? '',
      cidade: cliente.endereco?.cidade ?? '',
      uf: cliente.endereco?.uf,
    },
    perfilAssistido: {
      categorias: cliente.perfilAssistido?.categorias ?? [],
      possuiLaudo: cliente.perfilAssistido?.possuiLaudo ?? false,
      laudoValidoAte: cliente.perfilAssistido?.laudoValidoAte ?? '',
      observacoes: cliente.perfilAssistido?.observacoes ?? '',
    },
  }
}
