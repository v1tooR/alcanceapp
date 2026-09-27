/**
 * Interfaces comuns das integrações externas.
 *
 * O resto do sistema conhece apenas estas interfaces. Cada provedor mora no
 * próprio arquivo em ./provedores e é escolhido pela coluna `provider` da
 * tabela `integrations`. Trocar de provedor = novo adapter + mudar a linha no
 * banco; nenhum outro código muda.
 */

/** Linha da tabela `integrations` (sem segredos, por definição). */
export interface RegistroIntegracao {
  key: string
  name: string
  category: 'email' | 'storage' | 'antivirus'
  provider: string
  enabled: boolean
  config: Record<string, unknown>
  secret_names: string[]
}

/** Situação observada de um provedor, para a tela de integrações. */
export interface SituacaoProvedor {
  disponivel: boolean
  detalhe: string
}

/** E-mail transacional de acesso (convite e recuperação de senha). */
export interface ProvedorEmail {
  /** Cria a conta (se preciso) e envia o convite para definir a senha. */
  convidar(email: string, opcoes: { nome: string; redirecionarPara: string }): Promise<{ usuarioId: string }>
  situacao(): Promise<SituacaoProvedor>
}

/** Armazenamento dos arquivos de documentos. */
export interface ProvedorArmazenamento {
  baixar(caminho: string): Promise<Uint8Array>
  remover(caminho: string): Promise<void>
  /** URL assinada, de curta duração, acessível pelo navegador. */
  urlAssinada(caminho: string, segundos: number): Promise<string>
  situacao(): Promise<SituacaoProvedor>
}

export interface ResultadoVerificacao {
  limpo: boolean
  /** Nome da ameaça, quando encontrada. */
  assinatura?: string
}

/** Verificação de arquivos enviados. */
export interface ProvedorAntivirus {
  verificar(conteudo: Uint8Array): Promise<ResultadoVerificacao>
  situacao(): Promise<SituacaoProvedor>
}
