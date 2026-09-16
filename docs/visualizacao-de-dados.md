# Visualização de dados — padrão da Alcance

Regras e cores dos gráficos do painel. As cores foram **validadas por script**
(daltonismo, contraste e faixa de luminosidade), não escolhidas no olho. Os
valores vivem em `src/styles/globals.css`; os componentes usam só papéis
(`var(--chart-1)`), nunca hex.

> Mudou uma cor? Valide de novo antes de publicar. Um par de cores parecido
> para quem enxerga todas as cores pode ser indistinguível para quem tem
> daltonismo.

## Paleta categórica (identidade de série)

Ordem fixa — a ordem é o que mantém os vizinhos distinguíveis.

| Slot | Matiz | Claro (cartão `#ffffff`) | Escuro (cartão `#221031`) |
|---|---|---|---|
| 1 | Roxo (marca) | `#8f1bb3` | `#b25ad3` |
| 2 | Laranja (marca) | `#d9571a` | `#d95926` |
| 3 | Azul | `#2a78d6` | `#3987e5` |
| 4 | Ouro (marca, escurecido) | `#a87a00` | `#c98500` |

Resultado da validação:

| Verificação | Claro | Escuro |
|---|---|---|
| Faixa de luminosidade (OKLCH L) | ✅ todos em 0,43–0,77 | ✅ todos em 0,48–0,67 |
| Croma mínimo (C ≥ 0,10) | ✅ | ✅ |
| Pior par adjacente para daltonismo (meta ΔE ≥ 8) | ✅ 26,2 | ✅ 24,7 |
| Pior par adjacente sem daltonismo (piso ΔE ≥ 15) | ✅ 29,0 | ✅ 24,5 |
| Contraste com o cartão (≥ 3:1) | ✅ todos | ✅ todos |

O ouro original do site (`#d99700`) ficava em 2,5:1 sobre branco; foi escurecido
para `#a87a00` para dispensar exceção de contraste.

## Rampa ordinal (etapas em sequência — funil de documentos)

Um só matiz, luminosidade monotônica. No tema escuro a âncora inverte: a última
etapa é a mais clara.

| Etapa | Claro | Escuro |
|---|---|---|
| 1 | `#b97ad6` | `#7d3aa3` |
| 2 | `#9d45c3` | `#9d5cc4` |
| 3 | `#7f16a0` | `#bf86de` |
| 4 | `#560b70` | `#dcb4f0` |

Validação: monotônica ✅, diferença entre etapas ≥ 0,06 ✅, etapa mais próxima da
superfície acima de 2:1 ✅ (3,08:1 claro · 2,53:1 escuro), variação de matiz ≤ 3° ✅.

## A cor segue a situação

Em todo o painel, a mesma situação tem a mesma cor:

| Situação | Cor |
|---|---|
| Em andamento | slot 1 (roxo) |
| Aguardando cliente | slot 2 (laranja) |
| Aguardando órgão | slot 3 (azul) |
| Em avaliação / não iniciado | slot 4 (ouro) |

Vermelho, amarelo e verde de **status** (atraso, alerta, deferimento) ficam
reservados e sempre aparecem com ícone e rótulo — nunca como "série 5".

## Regras aplicadas nos componentes

- **Forma antes da cor.** Número único vira cartão de indicador; parte do todo
  vira barra empilhada; etapas viram funil; razão vira medidor. Nada de pizza.
- **Um eixo só.** Nunca dois eixos Y no mesmo gráfico.
- **Marcas finas.** Barras ≤ 24 px, ponta arredondada de 4 px e base reta;
  linhas de 2 px; 2 px de superfície entre segmentos, sem contorno.
- **Legenda sempre** que houver duas ou mais séries; rótulos diretos só onde
  importam (fim da linha, quando não colidem).
- **Dica ao passar o mouse e ao focar pelo teclado.** Linha de tendência tem guia
  vertical que encontra o mês; cada segmento de barra tem a própria dica.
- **Toda visualização tem versão em tabela** (botão "Tabela" no cartão).
- **Filtro de período numa linha acima** de tudo o que ele afeta. Cartões que são
  retrato atual levam o selo "Agora".
- **Recarregar não pisca:** o gráfico anterior fica esmaecido até os dados novos
  chegarem.
- **Mês corrente marcado com `*`**, para não ser lido como queda.
- **Números grandes com algarismos proporcionais**; `tabular-nums` só em colunas.
- **Movimento:** barras crescem e linhas se desenham uma vez, ao montar;
  `prefers-reduced-motion` desliga tudo.

## Tipografia

DM Sans variável (pesos 100–1000, eixo óptico), a mesma do site, empacotada no
app (`@fontsource-variable/dm-sans`) — sem requisição ao Google Fonts. Os
utilitários `alc-titulo-display`, `alc-numero`, `alc-chapeu` e `alc-destaque`
reproduzem o tratamento tipográfico do site.
