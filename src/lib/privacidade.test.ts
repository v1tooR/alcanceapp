import { describe, expect, it } from 'vitest'
import {
  cpfParcial,
  descricaoSeguraDocumento,
  emailParcial,
  exibirCpf,
  exigeAcaoParaVisualizar,
  mensagemErroSegura,
  primeiroNome,
  telefoneParcial,
} from '@/lib/privacidade'
import { ErroDeServico } from '@/services/erros'

describe('mascaramento de dados pessoais', () => {
  it('mostra apenas os três primeiros e os dois últimos dígitos do CPF', () => {
    expect(cpfParcial('52998224725')).toBe('529.***.***-25')
  })

  it('não expõe nada quando o CPF está incompleto', () => {
    expect(cpfParcial('529982')).toBe('—')
  })

  it('mostra o CPF completo só para a equipe', () => {
    expect(exibirCpf('52998224725', 'analista')).toBe('529.982.247-25')
    expect(exibirCpf('52998224725', 'cliente')).toBe('529.***.***-25')
    expect(exibirCpf('52998224725', undefined)).toBe('529.***.***-25')
  })

  it('mascara e-mail preservando o domínio', () => {
    expect(emailParcial('mariana@exemplo.com.br')).toBe('ma*****@exemplo.com.br')
  })

  it('mascara telefone preservando DDD e os quatro últimos dígitos', () => {
    expect(telefoneParcial('11987654321')).toBe('(11) *****-4321')
  })
})

describe('documentos sensíveis', () => {
  it('exige ação explícita para exibir documento sensível', () => {
    expect(exigeAcaoParaVisualizar({ sensivel: true })).toBe(true)
    expect(exigeAcaoParaVisualizar({ sensivel: false })).toBe(false)
  })

  it('substitui o título de documento sensível por descrição genérica', () => {
    expect(
      descricaoSeguraDocumento({ titulo: 'Laudo médico — CID X', sensivel: true }),
    ).toBe('Documento com informação sensível')
  })

  it('mantém o título de documento comum', () => {
    expect(descricaoSeguraDocumento({ titulo: 'Comprovante de endereço', sensivel: false })).toBe(
      'Comprovante de endereço',
    )
  })
})

describe('mensagens de erro', () => {
  it('exibe a mensagem de erros de serviço, já revisados', () => {
    const erro = new ErroDeServico('E-mail ou senha incorretos.', 'nao_autenticado', 401)
    expect(mensagemErroSegura(erro)).toBe('E-mail ou senha incorretos.')
  })

  it('não vaza detalhes de erros inesperados', () => {
    const erro = new Error('connection to postgres://usuario:senha@host falhou')
    expect(mensagemErroSegura(erro)).toBe('Não foi possível concluir a ação.')
  })

  it('aceita uma mensagem padrão específica da tela', () => {
    expect(mensagemErroSegura(null, 'Não foi possível cadastrar o cliente.')).toBe(
      'Não foi possível cadastrar o cliente.',
    )
  })
})

describe('primeiroNome', () => {
  it('retorna apenas o primeiro nome, para saudações', () => {
    expect(primeiroNome('Adriana Bastos Moreira')).toBe('Adriana')
  })
})
