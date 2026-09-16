import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App'

/**
 * Teste de fumaça da aplicação inteira.
 *
 * Monta provedores, roteador, store de sessão e camada de serviços de verdade.
 * Serve para pegar erros de ligação que a checagem de tipos não vê — provider
 * faltando, rota mal declarada, carregamento sob demanda quebrado.
 */
describe('Aplicação', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.pushState({}, '', '/entrar')
  })

  it('monta e mostra a tela de entrada quando não há sessão', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Entrar$/ })).toBeInTheDocument()
  })

  it('valida o formulário antes de chamar o serviço', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Entrar' }, { timeout: 5000 })
    await usuario.click(screen.getByRole('button', { name: /^Entrar$/ }))

    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument()
    expect(await screen.findByText('Informe a senha.')).toBeInTheDocument()
  })

  it('mostra mensagem genérica quando as credenciais estão erradas', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Entrar' }, { timeout: 5000 })

    await usuario.type(screen.getByLabelText(/E-mail/), 'helena@alcanceisencoes.com.br')
    await usuario.type(screen.getByLabelText(/Senha/), 'senha-errada')
    await usuario.click(screen.getByRole('button', { name: /^Entrar$/ }))

    // A mensagem não diferencia "e-mail inexistente" de "senha incorreta":
    // não revela quem tem conta no sistema.
    expect(
      await screen.findByText('E-mail ou senha incorretos.', undefined, { timeout: 5000 }),
    ).toBeInTheDocument()
  })
})
