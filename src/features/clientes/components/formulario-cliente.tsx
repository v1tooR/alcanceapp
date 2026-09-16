import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { InputCep, InputCpf, InputRg, InputTelefone } from '@/components/shared/campos-mascarados'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckboxCampo } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ROTULO_SITUACAO_CLIENTE, ROTULO_TIPO_CLIENTE, paraOpcoes } from '@/lib/rotulos'
import { UFS } from '@/types/domain'
import { esquemaCliente, type DadosCliente } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'

/** Rótulos genéricos de apoio; a equipe pode complementar em texto livre. */
const CATEGORIAS_SUGERIDAS = [
  'Mobilidade reduzida',
  'Deficiência física',
  'Deficiência auditiva',
  'Deficiência visual',
  'Deficiência intelectual',
  'Transtorno do espectro autista',
]

export interface FormularioClienteProps {
  valoresIniciais?: Partial<DadosCliente>
  aoEnviar: (dados: DadosCliente) => Promise<void>
  rotuloEnvio?: string
  erroServidor?: string | null
  aoCancelar?: () => void
}

const PADRAO: DadosCliente = {
  nome: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  email: '',
  telefone: '',
  tipo: 'condutor',
  situacao: 'ativo',
  responsavelId: '',
  acessoPortalAtivo: true,
  observacoesInternas: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: undefined },
  perfilAssistido: { categorias: [], possuiLaudo: false, laudoValidoAte: '', observacoes: '' },
}

export function FormularioCliente({
  valoresIniciais,
  aoEnviar,
  rotuloEnvio = 'Salvar cliente',
  erroServidor,
  aoCancelar,
}: FormularioClienteProps) {
  const equipe = useQuery({
    queryKey: chaves.usuarios.equipe(),
    queryFn: () => servicos.usuarios.listarEquipe(),
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DadosCliente>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: { ...PADRAO, ...valoresIniciais },
  })

  const categorias = watch('perfilAssistido.categorias') ?? []
  const possuiLaudo = watch('perfilAssistido.possuiLaudo')

  function alternarCategoria(categoria: string, marcada: boolean) {
    const atuais = new Set(categorias)
    if (marcada) atuais.add(categoria)
    else atuais.delete(categoria)
    setValue('perfilAssistido.categorias', [...atuais], { shouldDirty: true })
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
      {erroServidor && <Alert tom="perigo">{erroServidor}</Alert>}

      {/* Identificação */}
      <Card>
        <CardContent className="pt-5">
          <GrupoCampos titulo="Identificação">
            <Campo rotulo="Nome completo" erro={errors.nome?.message} obrigatorio>
              {(campo) => (
                <Input {...campo} {...register('nome')} autoComplete="name" placeholder="Nome do cliente" />
              )}
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="CPF" erro={errors.cpf?.message} obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="cpf"
                    render={({ field }) => (
                      <InputCpf {...campo} value={field.value} onChange={field.onChange} />
                    )}
                  />
                )}
              </Campo>

              <Campo rotulo="RG" erro={errors.rg?.message}>
                {(campo) => (
                  <Controller
                    control={control}
                    name="rg"
                    render={({ field }) => (
                      <InputRg {...campo} value={field.value ?? ''} onChange={field.onChange} />
                    )}
                  />
                )}
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Data de nascimento" erro={errors.dataNascimento?.message}>
                {(campo) => <Input {...campo} {...register('dataNascimento')} type="date" />}
              </Campo>

              <Campo
                rotulo="Perfil"
                dica="Define se o cliente dirige o veículo."
                erro={errors.tipo?.message}
                obrigatorio
              >
                {(campo) => (
                  <Controller
                    control={control}
                    name="tipo"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={campo.id} aria-invalid={campo['aria-invalid']}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paraOpcoes(ROTULO_TIPO_CLIENTE).map((opcao) => (
                            <SelectItem key={opcao.value} value={opcao.value}>
                              {opcao.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>
            </div>
          </GrupoCampos>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardContent className="pt-5">
          <GrupoCampos titulo="Contato">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="E-mail" erro={errors.email?.message} obrigatorio>
                {(campo) => (
                  <Input {...campo} {...register('email')} type="email" autoComplete="email" />
                )}
              </Campo>

              <Campo rotulo="Telefone" erro={errors.telefone?.message} obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="telefone"
                    render={({ field }) => (
                      <InputTelefone {...campo} value={field.value} onChange={field.onChange} />
                    )}
                  />
                )}
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Campo rotulo="CEP" erro={errors.endereco?.cep?.message}>
                {(campo) => (
                  <Controller
                    control={control}
                    name="endereco.cep"
                    render={({ field }) => (
                      <InputCep {...campo} value={field.value ?? ''} onChange={field.onChange} />
                    )}
                  />
                )}
              </Campo>

              <Campo rotulo="Logradouro">
                {(campo) => <Input {...campo} {...register('endereco.logradouro')} />}
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Número">
                {(campo) => <Input {...campo} {...register('endereco.numero')} inputMode="numeric" />}
              </Campo>
              <Campo rotulo="Complemento">
                {(campo) => <Input {...campo} {...register('endereco.complemento')} />}
              </Campo>
              <Campo rotulo="Bairro">
                {(campo) => <Input {...campo} {...register('endereco.bairro')} />}
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Campo rotulo="Cidade">
                {(campo) => <Input {...campo} {...register('endereco.cidade')} />}
              </Campo>
              <Campo rotulo="UF">
                {(campo) => (
                  <Controller
                    control={control}
                    name="endereco.uf"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger id={campo.id}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>
            </div>
          </GrupoCampos>
        </CardContent>
      </Card>

      {/* Perfil assistido — dado sensível */}
      <Card>
        <CardContent className="pt-5">
          <GrupoCampos
            titulo="Perfil assistido"
            descricao="Informação pessoal sensível. Preencha apenas o necessário ao atendimento; o conteúdo fica restrito à equipe e ao próprio cliente."
          >
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Categorias</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIAS_SUGERIDAS.map((categoria) => (
                  <CheckboxCampo
                    key={categoria}
                    id={`categoria-${categoria}`}
                    rotulo={categoria}
                    checked={categorias.includes(categoria)}
                    onCheckedChange={(marcada) => alternarCategoria(categoria, marcada)}
                  />
                ))}
              </div>
            </fieldset>

            <Controller
              control={control}
              name="perfilAssistido.possuiLaudo"
              render={({ field }) => (
                <CheckboxCampo
                  id="possui-laudo"
                  rotulo="Possui laudo médico"
                  descricao="Marque quando o cliente já tiver laudo em mãos."
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            {possuiLaudo && (
              <Campo rotulo="Laudo válido até" dica="Ajuda a antecipar renovações.">
                {(campo) => (
                  <Input {...campo} {...register('perfilAssistido.laudoValidoAte')} type="date" />
                )}
              </Campo>
            )}

            <Campo
              rotulo="Observações do perfil"
              dica="Evite registrar diagnósticos ou detalhes clínicos desnecessários."
            >
              {(campo) => (
                <Textarea
                  {...campo}
                  {...register('perfilAssistido.observacoes')}
                  rows={3}
                  placeholder="Informações úteis ao atendimento."
                />
              )}
            </Campo>
          </GrupoCampos>
        </CardContent>
      </Card>

      {/* Atendimento */}
      <Card>
        <CardContent className="pt-5">
          <GrupoCampos titulo="Atendimento">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Responsável pela conta">
                {(campo) => (
                  <Controller
                    control={control}
                    name="responsavelId"
                    render={({ field }) => (
                      <Select value={field.value || 'nenhum'} onValueChange={(valor) => field.onChange(valor === 'nenhum' ? '' : valor)}>
                        <SelectTrigger id={campo.id}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Sem responsável</SelectItem>
                          {equipe.data?.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>

              <Campo rotulo="Situação" erro={errors.situacao?.message} obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="situacao"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={campo.id}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paraOpcoes(ROTULO_SITUACAO_CLIENTE).map((opcao) => (
                            <SelectItem key={opcao.value} value={opcao.value}>
                              {opcao.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>
            </div>

            <Controller
              control={control}
              name="acessoPortalAtivo"
              render={({ field }) => (
                <CheckboxCampo
                  id="acesso-portal"
                  rotulo="Liberar acesso à área do cliente"
                  descricao="Cria o acesso para que o cliente acompanhe o próprio processo e envie documentos."
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            <Campo
              rotulo="Observações internas"
              dica="Visível apenas para a equipe — nunca aparece na área do cliente."
              erro={errors.observacoesInternas?.message}
            >
              {(campo) => (
                <Textarea {...campo} {...register('observacoesInternas')} rows={3} />
              )}
            </Campo>
          </GrupoCampos>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {aoCancelar && (
          <Button type="button" variante="contorno" onClick={aoCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" carregando={isSubmitting} textoCarregando="Salvando">
          <Save aria-hidden="true" />
          {rotuloEnvio}
        </Button>
      </div>
    </form>
  )
}
