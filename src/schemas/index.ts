import { z } from 'zod'
import {
  PAPEIS_USUARIO,
  PRIORIDADES,
  RESPONSAVEIS_ACAO,
  SITUACOES_CLIENTE,
  STATUS_FINANCEIRO,
  TIPOS_CLIENTE,
  TIPOS_DOCUMENTO,
  TIPOS_EVENTO,
  TIPOS_SUBPROCESSO,
  UFS,
  VISIBILIDADES_DOCUMENTO,
  VISIBILIDADES_EVENTO,
  FORMAS_PAGAMENTO,
} from '@/types/domain'
import { apenasDigitos, cepValido, cpfValido, telefoneValido } from '@/lib/mascaras'

/**
 * Esquemas de validação dos formulários.
 * As mensagens são escritas para o usuário final, em pt-BR.
 */

/* -- Blocos reutilizáveis --------------------------------------------------- */

const textoObrigatorio = (campo: string, minimo = 1) =>
  z.string().trim().min(minimo, `Informe ${campo}.`)

const cpf = z
  .string()
  .trim()
  .min(1, 'Informe o CPF.')
  .refine((valor) => apenasDigitos(valor).length === 11, 'O CPF deve ter 11 dígitos.')
  .refine(cpfValido, 'CPF inválido. Confira os números digitados.')

const telefone = z
  .string()
  .trim()
  .min(1, 'Informe o telefone.')
  .refine(telefoneValido, 'Telefone inválido. Use DDD + número.')

const email = z.email('E-mail inválido.').trim().toLowerCase()

// Sem `.transform()`: o React Hook Form trabalha com o tipo de entrada, e uma
// transformação faria entrada e saída divergirem. Strings vazias são tratadas
// como "não informado" na camada de serviço.
const dataOpcional = z.string().trim().optional()

/* -- Autenticação ----------------------------------------------------------- */

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.'),
  lembrar: z.boolean().optional(),
})
export type DadosLogin = z.infer<typeof esquemaLogin>

export const esquemaRecuperacao = z.object({ email })
export type DadosRecuperacao = z.infer<typeof esquemaRecuperacao>

/* -- Cliente ---------------------------------------------------------------- */

export const esquemaEndereco = z.object({
  cep: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((valor) => !valor || cepValido(valor), 'CEP inválido.'),
  logradouro: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  uf: z.enum(UFS).optional(),
})

export const esquemaCliente = z.object({
  nome: textoObrigatorio('o nome completo', 3),
  cpf,
  rg: z.string().trim().optional(),
  dataNascimento: dataOpcional,
  email,
  telefone,
  tipo: z.enum(TIPOS_CLIENTE),
  situacao: z.enum(SITUACOES_CLIENTE),
  responsavelId: z.string().optional(),
  acessoPortalAtivo: z.boolean(),
  observacoesInternas: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
  endereco: esquemaEndereco.optional(),
  perfilAssistido: z
    .object({
      categorias: z.array(z.string().trim()),
      possuiLaudo: z.boolean(),
      laudoValidoAte: dataOpcional,
      observacoes: z.string().trim().max(1000, 'Máximo de 1000 caracteres.').optional(),
    })
    .optional(),
})
export type DadosCliente = z.infer<typeof esquemaCliente>

/* -- Processo --------------------------------------------------------------- */

export const esquemaProcesso = z.object({
  clienteId: textoObrigatorio('o cliente'),
  titulo: textoObrigatorio('o título do processo', 3),
  prioridade: z.enum(PRIORIDADES),
  responsavelId: z.string().optional(),
  prazoFinal: dataOpcional,
  resumoPublico: z.string().trim().max(600, 'Máximo de 600 caracteres.').optional(),
  observacoesInternas: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
  subprocessos: z
    .array(z.enum(TIPOS_SUBPROCESSO))
    .min(1, 'Selecione ao menos um subprocesso aplicável.'),
})
export type DadosProcesso = z.infer<typeof esquemaProcesso>

export const esquemaEdicaoProcesso = esquemaProcesso.omit({ clienteId: true, subprocessos: true })
export type DadosEdicaoProcesso = z.infer<typeof esquemaEdicaoProcesso>

/* -- Subprocesso ------------------------------------------------------------ */

export const esquemaSubprocesso = z.object({
  tipo: z.enum(TIPOS_SUBPROCESSO),
  responsavelId: z.string().optional(),
  orgao: z.string().trim().max(120).optional(),
  prazo: dataOpcional,
  proximaAcao: z.string().trim().max(300, 'Máximo de 300 caracteres.').optional(),
  observacoesInternas: z.string().trim().max(2000).optional(),
  criarEtapasSugeridas: z.boolean(),
})
export type DadosSubprocesso = z.infer<typeof esquemaSubprocesso>

export const esquemaEdicaoSubprocesso = z.object({
  responsavelId: z.string().optional(),
  orgao: z.string().trim().max(120).optional(),
  protocolo: z.string().trim().max(60).optional(),
  prazo: dataOpcional,
  proximaAcao: z.string().trim().max(300, 'Máximo de 300 caracteres.').optional(),
  responsavelProximaAcao: z.enum(RESPONSAVEIS_ACAO).optional(),
  motivoBloqueio: z.string().trim().max(300).optional(),
  observacoesInternas: z.string().trim().max(2000).optional(),
})
export type DadosEdicaoSubprocesso = z.infer<typeof esquemaEdicaoSubprocesso>

/* -- Etapa ------------------------------------------------------------------ */

export const esquemaEtapa = z.object({
  titulo: textoObrigatorio('o título da etapa', 3),
  descricao: z.string().trim().max(500).optional(),
  responsavelId: z.string().optional(),
  prazo: dataOpcional,
  observacao: z.string().trim().max(500).optional(),
  observacoesInternas: z.string().trim().max(1000).optional(),
  visivelCliente: z.boolean(),
})
export type DadosEtapa = z.infer<typeof esquemaEtapa>

/* -- Documento -------------------------------------------------------------- */

export const esquemaSolicitacaoDocumento = z.object({
  clienteId: textoObrigatorio('o cliente'),
  processoId: z.string().optional(),
  subprocessoId: z.string().optional(),
  tipo: z.enum(TIPOS_DOCUMENTO),
  titulo: textoObrigatorio('o título do documento', 3),
  prazoEnvio: dataOpcional,
  visibilidade: z.enum(VISIBILIDADES_DOCUMENTO),
  sensivel: z.boolean(),
  observacoesInternas: z.string().trim().max(1000).optional(),
})
export type DadosSolicitacaoDocumento = z.infer<typeof esquemaSolicitacaoDocumento>

export const esquemaDevolucaoDocumento = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, 'Explique o motivo com ao menos 10 caracteres — o cliente lerá esta mensagem.')
    .max(500, 'Máximo de 500 caracteres.'),
  novoPrazo: dataOpcional,
})
export type DadosDevolucaoDocumento = z.infer<typeof esquemaDevolucaoDocumento>

/* -- Movimentação ----------------------------------------------------------- */

export const esquemaMovimentacao = z.object({
  titulo: textoObrigatorio('o título da movimentação', 3),
  descricao: z.string().trim().max(1000, 'Máximo de 1000 caracteres.').optional(),
  subprocessoId: z.string().optional(),
  visivelCliente: z.boolean(),
})
export type DadosMovimentacao = z.infer<typeof esquemaMovimentacao>

/* -- Evento de calendário --------------------------------------------------- */

export const esquemaEvento = z.object({
  titulo: textoObrigatorio('o título do evento', 3),
  descricao: z.string().trim().max(500).optional(),
  data: textoObrigatorio('a data'),
  hora: z.string().trim().optional(),
  tipo: z.enum(TIPOS_EVENTO),
  visibilidade: z.enum(VISIBILIDADES_EVENTO),
  clienteId: z.string().optional(),
  processoId: z.string().optional(),
  responsavelId: z.string().optional(),
  local: z.string().trim().max(160).optional(),
})
export type DadosEvento = z.infer<typeof esquemaEvento>

/* -- Financeiro ------------------------------------------------------------- */

export const esquemaFinanceiro = z
  .object({
    clienteId: textoObrigatorio('o cliente'),
    processoId: z.string().optional(),
    descricao: textoObrigatorio('a descrição', 3),
    valorTotal: z.number().min(0.01, 'Informe um valor maior que zero.'),
    desconto: z.number().min(0, 'O desconto não pode ser negativo.'),
    valorPago: z.number().min(0, 'O valor pago não pode ser negativo.'),
    status: z.enum(STATUS_FINANCEIRO),
    formaPagamento: z.enum(FORMAS_PAGAMENTO).optional(),
    vencimento: dataOpcional,
    pagoEm: dataOpcional,
    observacoes: z.string().trim().max(1000).optional(),
  })
  .refine((dados) => dados.desconto <= dados.valorTotal, {
    message: 'O desconto não pode ser maior que o valor total.',
    path: ['desconto'],
  })
  .refine((dados) => dados.valorPago <= dados.valorTotal - dados.desconto, {
    message: 'O valor pago não pode ultrapassar o valor líquido.',
    path: ['valorPago'],
  })
export type DadosFinanceiro = z.infer<typeof esquemaFinanceiro>

/* -- Usuário da equipe ------------------------------------------------------ */

export const esquemaUsuario = z.object({
  nome: textoObrigatorio('o nome', 3),
  email,
  telefone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((valor) => !valor || telefoneValido(valor), 'Telefone inválido.'),
  papel: z.enum(PAPEIS_USUARIO),
  cargo: z.string().trim().max(80).optional(),
  ativo: z.boolean(),
})
export type DadosUsuario = z.infer<typeof esquemaUsuario>
