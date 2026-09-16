import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Campo } from '@/components/shared/campo'
import { Input } from '@/components/ui/input'

/**
 * O envelope de campo é a base da acessibilidade de todos os formulários.
 * Se esta ligação quebrar, leitores de tela deixam de anunciar rótulo, dica e
 * erro — por isso ela é verificada por teste.
 */
describe('Campo', () => {
  it('associa o rótulo ao controle pelo id', async () => {
    render(
      <Campo rotulo="CPF">{(campo) => <Input {...campo} defaultValue="" />}</Campo>,
    )

    const controle = screen.getByLabelText('CPF')
    expect(controle).toBeInTheDocument()

    await userEvent.click(screen.getByText('CPF'))
    expect(controle).toHaveFocus()
  })

  it('anuncia campo obrigatório', () => {
    render(<Campo rotulo="Nome" obrigatorio>{(campo) => <Input {...campo} />}</Campo>)
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute('aria-required', 'true')
  })

  it('liga a dica ao controle por aria-describedby', () => {
    render(
      <Campo rotulo="Telefone" dica="Use DDD + número.">
        {(campo) => <Input {...campo} />}
      </Campo>,
    )

    const controle = screen.getByLabelText('Telefone')
    const descritores = controle.getAttribute('aria-describedby')
    expect(descritores).toBeTruthy()
    expect(document.getElementById(descritores!)).toHaveTextContent('Use DDD + número.')
  })

  it('marca o controle como inválido e anuncia o erro', () => {
    render(
      <Campo rotulo="E-mail" erro="E-mail inválido.">
        {(campo) => <Input {...campo} />}
      </Campo>,
    )

    const controle = screen.getByLabelText('E-mail')
    expect(controle).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido.')
    expect(controle.getAttribute('aria-describedby')).toContain(
      screen.getByRole('alert').id,
    )
  })

  it('não marca como inválido quando não há erro', () => {
    render(<Campo rotulo="Cidade">{(campo) => <Input {...campo} />}</Campo>)
    expect(screen.getByLabelText('Cidade')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
